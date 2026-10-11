'use strict';

const test = require('node:test');
const assert = require('node:assert');
// Load environment variables before initializing the database connection pool
require('../src/infrastructure/config/loadEnv')();
const db = require('../src/infrastructure/db/db');
const createContainer = require('../src/container');
const RouterDispatcher = require('../src/interfaces/http/router/RouterDispatcher');
const {EmptyCartError, InsufficientStockError} = require('../src/domain/errors');

/**
 * Integration suite for the orders module.
 * Runs the real chain: controller -> use case -> PgUnitOfWork -> Pg repositories -> PostgreSQL.
 */
test('Orders Integration Suite (PostgreSQL)', async (t) => {
  const suffix = `${process.pid}_${Date.now()}`;
  const createdUserIds = [];
  const createdProductIds = [];
  let container;

  const createMockResponse = () => ({
    statusCode: null,
    body: null,
    headersSent: false,
    writeHead(status) { this.statusCode = status; this.headersSent = true; },
    end(data) { this.body = JSON.parse(data); }
  });

  const seedUser = async (label) => {
    const {rows} = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, role',
      [`Order ${label}`, `orders_${label}_${suffix}@test.com`, 'password']
    );
    createdUserIds.push(rows[0].id);
    return rows[0];
  };

  const seedProduct = async (label, price, stock) => {
    const {rows} = await db.query(
      'INSERT INTO products (title, price, stock) VALUES ($1, $2, $3) RETURNING id',
      [`${label} ${suffix}`, price, stock]
    );
    createdProductIds.push(rows[0].id);
    return rows[0].id;
  };

  const fillCart = async (userId, items) => {
    const {rows} = await db.query(
      'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [userId]
    );
    const cartId = rows[0].id;
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    for (const {productId, quantity} of items) {
      await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [cartId, productId, quantity]);
    }
    return cartId;
  };

  const getStock = async (productId) =>
    Number((await db.query('SELECT stock FROM products WHERE id = $1', [productId])).rows[0].stock);

  const countCartItems = async (cartId) =>
    (await db.query('SELECT 1 FROM cart_items WHERE cart_id = $1', [cartId])).rowCount;

  const countOrders = async (userId) =>
    (await db.query('SELECT 1 FROM orders WHERE user_id = $1', [userId])).rowCount;

  t.before(async () => {
    await db.connect();
    container = createContainer({db});
  });

  t.after(async () => {
    // Cascade constraints remove carts, cart items, orders and order items of these users
    if (createdUserIds.length) await db.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    if (createdProductIds.length) await db.query('DELETE FROM products WHERE id = ANY($1)', [createdProductIds]);
    await db.disconnect();
  });

  await t.test('checkout should convert cart to order, decrease stock and clear cart', async () => {
    const user = await seedUser('happy');
    const bookId = await seedProduct('Checkout Book', 50.00, 2);
    const penId = await seedProduct('Checkout Pen', 0.10, 10);
    const cartId = await fillCart(user.id, [{productId: bookId, quantity: 1}, {productId: penId, quantity: 3}]);
    const res = createMockResponse();

    await container.controllers.order.checkout({}, res, {}, {user});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Order placed successfully!');
    assert.strictEqual(res.body.order.totalPrice, 50.30);
    assert.strictEqual(res.body.order.status, 'paid');
    assert.strictEqual(res.body.order.items.length, 2);
    assert.ok(Number.isInteger(res.body.order.id));

    assert.strictEqual(await getStock(bookId), 1);
    assert.strictEqual(await getStock(penId), 7);
    assert.strictEqual(await countCartItems(cartId), 0);

    // Price and title snapshot persisted in order_items
    const {rows} = await db.query(
      'SELECT title, price, quantity FROM order_items WHERE order_id = $1 ORDER BY title', [res.body.order.id]
    );
    assert.deepStrictEqual(rows.map(r => [r.title, Number(r.price), r.quantity]), [
      [`Checkout Book ${suffix}`, 50, 1],
      [`Checkout Pen ${suffix}`, 0.1, 3]
    ]);
  });

  await t.test('checkout should ROLLBACK everything when stock is insufficient', async () => {
    const user = await seedUser('nostock');
    const okId = await seedProduct('Rollback OK Book', 10.00, 5);
    const rareId = await seedProduct('Rollback Rare Book', 99.00, 2);
    const cartId = await fillCart(user.id, [{productId: okId, quantity: 1}, {productId: rareId, quantity: 3}]);

    await assert.rejects(
      container.controllers.order.checkout({}, createMockResponse(), {}, {user}),
      (err) => err instanceof InsufficientStockError && err.message.includes('Available: 2')
    );

    assert.strictEqual(await getStock(okId), 5);
    assert.strictEqual(await getStock(rareId), 2);
    assert.strictEqual(await countCartItems(cartId), 2);
    assert.strictEqual(await countOrders(user.id), 0);
  });

  await t.test('checkout should reject an empty cart without creating an order', async () => {
    const user = await seedUser('empty');
    await fillCart(user.id, []);

    await assert.rejects(
      container.controllers.order.checkout({}, createMockResponse(), {}, {user}),
      EmptyCartError
    );
    assert.strictEqual(await countOrders(user.id), 0);
  });

  await t.test('concurrent checkouts must not oversell the last unit (FOR UPDATE in one transaction)', async () => {
    const productId = await seedProduct('Last Unit', 15.00, 1);
    const buyers = await Promise.all([seedUser('race_a'), seedUser('race_b'), seedUser('race_c')]);
    for (const buyer of buyers) await fillCart(buyer.id, [{productId, quantity: 1}]);

    const results = await Promise.allSettled(
      buyers.map((buyer) => container.useCases.checkout({userId: buyer.id}))
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    assert.strictEqual(fulfilled.length, 1, 'exactly one buyer gets the last unit');
    assert.strictEqual(rejected.length, 2);
    for (const r of rejected) assert.ok(r.reason instanceof InsufficientStockError);

    assert.strictEqual(await getStock(productId), 0);
    const {rows} = await db.query(
      'SELECT count(*)::int AS n FROM order_items WHERE product_id = $1', [productId]
    );
    assert.strictEqual(rows[0].n, 1);
  });

  await t.test('a failed transaction must release its connection back to the pool', async () => {
    const user = await seedUser('pool');
    await fillCart(user.id, []);

    // pool max = 10: more failures than connections would hang if clients leaked
    for (let i = 0; i < 15; i++) {
      await assert.rejects(container.useCases.checkout({userId: user.id}), EmptyCartError);
    }
    assert.strictEqual(db.pool.totalCount <= 10, true);
    assert.strictEqual(db.pool.idleCount, db.pool.totalCount);
  });

  await t.test('getHistory should return orders with items aggregated by PostgreSQL json_agg', async () => {
    const user = await seedUser('history');
    const productId = await seedProduct('History Book', 25.00, 10);
    const {rows: [order]} = await db.query(
      "INSERT INTO orders (user_id, total_price, status) VALUES ($1, 50.00, 'paid') RETURNING id", [user.id]
    );
    await db.query(
      'INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES ($1, $2, $3, 25.00, 2)',
      [order.id, productId, 'History Book']
    );
    const res = createMockResponse();

    await container.controllers.order.getHistory({}, res, {}, {user});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.orders.length, 1);
    const [target] = res.body.orders;
    assert.strictEqual(target.id, order.id);
    assert.strictEqual(Number(target.total_price), 50.00);
    assert.deepStrictEqual(target.items.map(i => [i.title, Number(i.price), i.quantity]), [['History Book', 25, 2]]);
  });

  await t.test('getHistory should return an empty items array for an order without items', async () => {
    const user = await seedUser('noitems');
    await db.query("INSERT INTO orders (user_id, total_price, status) VALUES ($1, 0, 'paid')", [user.id]);
    const res = createMockResponse();

    await container.controllers.order.getHistory({}, res, {}, {user});

    assert.deepStrictEqual(res.body.orders[0].items, []);
  });

  await t.test('HTTP: POST /api/orders through router + authStage returns 201, then 400 on empty cart', async () => {
    const dispatcher = new RouterDispatcher(container.router);
    const user = await seedUser('http');
    const productId = await seedProduct('HTTP Book', 12.50, 3);
    await fillCart(user.id, [{productId, quantity: 2}]);
    const token = container.services.tokens.issue({id: user.id, role: user.role});
    const request = () => ({url: '/api/orders', method: 'POST', headers: {authorization: `Bearer ${token}`}});

    const first = createMockResponse();
    await dispatcher.dispatch(request(), first);
    assert.strictEqual(first.statusCode, 201);
    assert.strictEqual(first.body.order.totalPrice, 25);

    const second = createMockResponse();
    await dispatcher.dispatch(request(), second);
    assert.strictEqual(second.statusCode, 400);
    assert.strictEqual(second.body.error, 'Cannot checkout an empty cart');

    const unauthorized = createMockResponse();
    await dispatcher.dispatch({url: '/api/orders', method: 'POST', headers: {}}, unauthorized);
    assert.strictEqual(unauthorized.statusCode, 401);
  });
});

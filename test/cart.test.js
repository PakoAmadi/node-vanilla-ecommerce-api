'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/infrastructure/config/loadEnv')();
const db = require('../src/infrastructure/db/db');
const createContainer = require('../src/container');
const RouterDispatcher = require('../src/interfaces/http/router/RouterDispatcher');
const {generateToken} = require('../src/infrastructure/security/jwt');
const {
  ProductNotFoundError, InsufficientStockError, CartItemNotFoundError
} = require('../src/domain/errors');

/**
 * Integration suite for the cart module.
 * Real chain: controller -> use case -> PgUnitOfWork / PgCartRepository -> PostgreSQL.
 * Every subtest works with its own user, so tests do not depend on each other.
 */
test('Cart Integration Suite (PostgreSQL)', async (t) => {
  const suffix = `${process.pid}_${Date.now()}`;
  const createdUserIds = [];
  const createdProductIds = [];
  let cart; // container.controllers.cart

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
      [`Cart ${label}`, `cart_${label}_${suffix}@test.com`, 'password']
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

  const cartQuantity = async (userId, productId) => {
    const {rows} = await db.query(
      `SELECT ci.quantity FROM carts c JOIN cart_items ci ON ci.cart_id = c.id
       WHERE c.user_id = $1 AND ci.product_id = $2`,
      [userId, productId]
    );
    return rows.length ? rows[0].quantity : 0;
  };

  const add = (user, productId, quantity) =>
    cart.addItem({}, createMockResponse(), {}, {user, body: {productId, quantity}});

  t.before(async () => {
    await db.connect();
    cart = createContainer({db}).controllers.cart;
  });

  t.after(async () => {
    if (createdUserIds.length) await db.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    if (createdProductIds.length) await db.query('DELETE FROM products WHERE id = ANY($1)', [createdProductIds]);
    await db.disconnect();
  });

  await t.test('addItem should create the cart on first add and return 200', async () => {
    const user = await seedUser('first');
    const productId = await seedProduct('Cart Laptop', 1200.00, 5);
    const res = createMockResponse();

    await cart.addItem({}, res, {}, {user, body: {productId, quantity: 2}});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Item added to cart successfully!');
    assert.strictEqual(await cartQuantity(user.id, productId), 2);
  });

  await t.test('addItem should sum quantities on repeated adds (UPSERT)', async () => {
    const user = await seedUser('upsert');
    const productId = await seedProduct('Cart Mouse', 25.00, 10);

    await add(user, productId, 2);
    await add(user, productId, 3);

    assert.strictEqual(await cartQuantity(user.id, productId), 5);
    const {rowCount} = await db.query(
      'SELECT 1 FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1', [user.id]
    );
    assert.strictEqual(rowCount, 1, 'one row per product');
  });

  await t.test('addItem should reject a non-existing product with ProductNotFoundError', async () => {
    const user = await seedUser('missing');
    await assert.rejects(add(user, 999999999, 1), ProductNotFoundError);
  });

  await t.test('addItem should count quantity already in cart against stock', async () => {
    const user = await seedUser('stock');
    const productId = await seedProduct('Cart Rare', 10.00, 3);

    await add(user, productId, 2);
    await assert.rejects(add(user, productId, 2), (err) =>
      err instanceof InsufficientStockError && err.message === 'Not enough stock available');

    assert.strictEqual(await cartQuantity(user.id, productId), 2, 'cart unchanged after rejection');
  });

  await t.test('concurrent first adds by the same user must not fail and must sum up', async () => {
    const user = await seedUser('race');
    const productId = await seedProduct('Cart Race', 1.00, 100);

    const results = await Promise.allSettled(Array.from({length: 5}, () => add(user, productId, 2)));

    const failures = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
    assert.deepStrictEqual(failures, []);
    assert.strictEqual(await cartQuantity(user.id, productId), 10);
    const {rowCount} = await db.query('SELECT 1 FROM carts WHERE user_id = $1', [user.id]);
    assert.strictEqual(rowCount, 1, 'exactly one cart per user');
  });

  await t.test('concurrent adds must not exceed stock together', async () => {
    const user = await seedUser('race_stock');
    const productId = await seedProduct('Cart Race Stock', 1.00, 5);

    const results = await Promise.allSettled(Array.from({length: 5}, () => add(user, productId, 2)));

    const ok = results.filter(r => r.status === 'fulfilled').length;
    assert.strictEqual(ok, 2, '2 + 2 fit into stock 5, the rest are rejected');
    for (const r of results.filter(r => r.status === 'rejected')) {
      assert.ok(r.reason instanceof InsufficientStockError);
    }
    assert.strictEqual(await cartQuantity(user.id, productId), 4);
  });

  await t.test('getCart should return items and exact totals', async () => {
    const user = await seedUser('get');
    const laptop = await seedProduct('Get Laptop', 1200.00, 5);
    const pen = await seedProduct('Get Pen', 0.10, 50);
    const eraser = await seedProduct('Get Eraser', 0.20, 50);
    await add(user, laptop, 2);
    await add(user, pen, 1);
    await add(user, eraser, 1);
    const res = createMockResponse();

    await cart.getCart({}, res, {}, {user});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.cart.length, 3);
    const [first] = res.body.cart;
    assert.strictEqual(first.product_id, laptop);
    assert.strictEqual(first.quantity, 2);
    assert.strictEqual(first.price, '1200.00');
    assert.strictEqual(first.total_item_price, '2400.00');
    assert.ok(Number.isInteger(first.item_id));
    assert.strictEqual(res.body.total_cart_price, 2400.30);
  });

  await t.test('getCart should return an empty cart for a user without one', async () => {
    const user = await seedUser('empty');
    const res = createMockResponse();

    await cart.getCart({}, res, {}, {user});

    assert.deepStrictEqual(res.body, {cart: [], total_cart_price: 0});
  });

  await t.test('removeItem should delete product from cart', async () => {
    const user = await seedUser('remove');
    const productId = await seedProduct('Remove Book', 5.00, 5);
    await add(user, productId, 1);
    const res = createMockResponse();

    await cart.removeItem({}, res, {productId: String(productId)}, {user});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Item removed from cart');
    assert.strictEqual(await cartQuantity(user.id, productId), 0);
  });

  await t.test('removeItem should throw CartItemNotFoundError for an item not in cart', async () => {
    const user = await seedUser('remove_missing');
    const productId = await seedProduct('Remove Missing', 5.00, 5);

    await assert.rejects(
      cart.removeItem({}, createMockResponse(), {productId: String(productId)}, {user}),
      CartItemNotFoundError
    );
  });

  await t.test('removeItem must not touch another user\'s cart', async () => {
    const owner = await seedUser('owner');
    const stranger = await seedUser('stranger');
    const productId = await seedProduct('Owner Book', 5.00, 5);
    await add(owner, productId, 1);

    await assert.rejects(
      cart.removeItem({}, createMockResponse(), {productId: String(productId)}, {user: stranger}),
      CartItemNotFoundError
    );
    assert.strictEqual(await cartQuantity(owner.id, productId), 1);
  });

  await t.test('HTTP: /api/cart through router, stages and error mapper', async () => {
    const router = require('../src/interfaces/http/routes');
    const dispatcher = new RouterDispatcher(router);
    const user = await seedUser('http');
    const productId = await seedProduct('HTTP Cart Book', 12.50, 3);
    const token = generateToken({id: user.id, role: user.role}, process.env.JWT_TOKEN_SECRET || 'super_secret_key');
    const auth = {authorization: `Bearer ${token}`};

    // body is read by validationStage from the request stream
    const request = (method, url, body) => {
      const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
      return {
        method, url, headers: auth,
        async *[Symbol.asyncIterator]() { yield* payload; }
      };
    };
    const call = async (req) => { const res = createMockResponse(); await dispatcher.dispatch(req, res); return res; };

    assert.strictEqual((await call(request('POST', '/api/cart', {productId, quantity: 2}))).statusCode, 200);

    const tooMany = await call(request('POST', '/api/cart', {productId, quantity: 2}));
    assert.strictEqual(tooMany.statusCode, 400);
    assert.strictEqual(tooMany.body.error, 'Not enough stock available');

    const missing = await call(request('POST', '/api/cart', {productId: 999999999, quantity: 1}));
    assert.strictEqual(missing.statusCode, 404);
    assert.strictEqual(missing.body.error, 'Product not found');

    const got = await call(request('GET', '/api/cart'));
    assert.strictEqual(got.statusCode, 200);
    assert.strictEqual(got.body.total_cart_price, 25);

    const badId = await call(request('DELETE', '/api/cart/abc'));
    assert.strictEqual(badId.statusCode, 400, 'was 500 before refactoring');
    assert.strictEqual(badId.body.error, 'Valid Product ID is required');

    assert.strictEqual((await call(request('DELETE', `/api/cart/${productId}`))).statusCode, 200);
    assert.strictEqual((await call(request('DELETE', `/api/cart/${productId}`))).statusCode, 404);

    const noAuth = createMockResponse();
    await dispatcher.dispatch({method: 'GET', url: '/api/cart', headers: {}}, noAuth);
    assert.strictEqual(noAuth.statusCode, 401);
  });
});

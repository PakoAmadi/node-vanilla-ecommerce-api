'use strict';

const test = require('node:test');
const assert = require('node:assert');
// Load environment variables before initializing the database connection pool
require('../src/config/env')();
const db = require('../src/database/db');
const orderHandler = require('../src/handlers/orderHandler');
const { BadRequestError } = require('../src/errors/errors');

test('Orders Handler Integration Suite', async (t) => {
  let testUserId;
  let mockCtx;

  /**
   * Helper function to instantiate a mock HTTP ServerResponse object.
   * Duck-typing bypasses the need to spin up a real network server.
   */
  const createMockResponse = () => ({
    statusCode: null,
    body: null,
    writeHead(status) { this.statusCode = status; },
    end(data) { this.body = JSON.parse(data); }
  });

  // Seed primary user once before executing tests
  t.before(async () => {
    await db.connect();

    // Seed a unique test customer record
    const userSeed = await db.query(
      "INSERT INTO users (name, email, password) VALUES ('Order Tester', 'orders@test.com', 'password') RETURNING id, role"
    );
    const seededUser = userSeed.rows ? userSeed.rows[0] : userSeed[0];
    testUserId = seededUser.id;

    mockCtx = {
      user: { id: testUserId, role: seededUser.role }
    };
  });

  // Global teardown to clean up persisted user states and close the pool cleanly
  t.after(async () => {
    // Cascade constraints will handle clearing orders linked to this user
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await db.disconnect();
  });

  await t.test('checkout() should successfully convert cart to order, decrease stock, and clear cart', async () => {
    // 1. Create a dedicated product strictly for this test isolated execution context
    const productSeed = await db.query(
      "INSERT INTO products (title, price, stock) VALUES ('Checkout Isolated Book', 50.00, 2) RETURNING id"
    );
    const testProductId = productSeed.rows ? productSeed.rows[0].id : productSeed[0].id;

    const res = createMockResponse();

    // 2. Safe insert or update of the test user's cart
    const cart = await db.query(
      'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [testUserId]
    );
    const activeCart = cart.rows ? cart.rows[0] : cart[0];

    // Clear any residual items and insert exactly 1 item
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [activeCart.id]);
    await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [activeCart.id, testProductId, 1]);

    // 3. Execute checkout
    await orderHandler.checkout({}, res, {}, mockCtx);

    // 4. Assert response outputs
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Order placed successfully!');
    assert.strictEqual(res.body.order.totalPrice, 50.00);

    // 5. Verify database inventory reduction (2 - 1 = 1)
    const productCheck = await db.query('SELECT stock FROM products WHERE id = $1', [testProductId]);
    const currentProduct = productCheck.rows ? productCheck.rows[0] : productCheck[0];
    assert.strictEqual(Number(currentProduct.stock), 1);

    // 6. Ensure cart items are purged
    const cartCheck = await db.query('SELECT * FROM cart_items WHERE cart_id = $1', [activeCart.id]);
    const cartItemsCount = cartCheck.rows ? cartCheck.rows.length : cartCheck.length;
    assert.strictEqual(cartItemsCount, 0);

    // Local teardown for this isolated subtest product
    await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
  });

  await t.test('checkout() should throw BadRequestError and ROLLBACK if requested quantity exceeds stock', async () => {
    // 1. Create a fresh dedicated product with exactly 2 units in stock
    const productSeed = await db.query(
      "INSERT INTO products (title, price, stock) VALUES ('Rollback Isolated Book', 99.00, 2) RETURNING id"
    );
    const testProductId = productSeed.rows ? productSeed.rows[0].id : productSeed[0].id;

    // 2. Initialize cart safely and add an invalid amount of items (3 units requested, only 2 exist)
    const cart = await db.query(
      'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [testUserId]
    );
    const activeCart = cart.rows ? cart.rows[0] : cart[0];

    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [activeCart.id]);
    await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [activeCart.id, testProductId, 3]);

    // 3. Assert that business inventory validation breaks operations and rejects the promise
    await assert.rejects(
      async () => {
        await orderHandler.checkout({}, createMockResponse(), {}, mockCtx);
      },
      (err) => err instanceof BadRequestError
    );

    // 4. Confirm product stock remains unmutated at original value (2) due to a flawless backend SQL ROLLBACK
    const productCheck = await db.query('SELECT stock FROM products WHERE id = $1', [testProductId]);
    const currentProduct = productCheck.rows ? productCheck.rows[0] : productCheck[0];
    assert.strictEqual(Number(currentProduct.stock), 2);

    // Local teardown for this isolated subtest product
    await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
  });

  await t.test('getHistory() should return historical orders structured via native PostgreSQL JSON aggregation', async () => {
    const res = createMockResponse();

    // 1. Create a temporary product for historical logging referencing
    const productSeed = await db.query(
      "INSERT INTO products (title, price, stock) VALUES ('History Book', 25.00, 10) RETURNING id"
    );
    const testProductId = productSeed.rows ? productSeed.rows[0].id : productSeed[0].id;

    // 2. Inject simulated historical dataset directly using database macros
    const order = await db.query(
      "INSERT INTO orders (user_id, total_price, status) VALUES ($1, $2, 'paid') RETURNING id",
      [testUserId, 50.00]
    );
    const createdOrder = order.rows ? order.rows[0] : order[0];
    await db.query(
      "INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES ($1, $2, 'History Book', 25.00, 2)",
      [createdOrder.id, testProductId]
    );

    // 3. Dispatch request to fetch history
    await orderHandler.getHistory({}, res, {}, mockCtx);

    // 4. Verify nested document nodes returned from PostgreSQL engine aggregation macros
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.orders));

    const targetOrder = res.body.orders[0];
    assert.strictEqual(targetOrder.id, createdOrder.id);
    assert.strictEqual(Number(targetOrder.total_price), 50.00);

    // Evaluate json_agg structure arrays constructed directly inside SQL layer
    assert.ok(Array.isArray(targetOrder.items));
    assert.strictEqual(targetOrder.items[0].title, 'History Book');
    assert.strictEqual(Number(targetOrder.items[0].price), 25.00);
    assert.strictEqual(targetOrder.items[0].quantity, 2);

    // Local teardown for historical product and linked order items (handled by cascade)
    await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
    await db.query('DELETE FROM orders WHERE id = $1', [createdOrder.id]);
  });

});

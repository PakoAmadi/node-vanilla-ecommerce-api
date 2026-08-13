'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/config/env')();
const db = require('../src/database/db');
const cartHandler = require('../src/handlers/cartHandler');
const { NotFoundError } = require('../src/errors/errors');

test('Shopping Cart Handler Integration', async (t) => {
  const jwtSecret = (process.env.JWT_SECRET || 'super_secret_key').trim();
  let testUserId;
  let testProductId;
  let mockCtx;

  //  A helper function for creating a mock response using `res`
  const createMockResponse = () => ({
    statusCode: null,
    body: null,
    writeHead(status) { this.statusCode = status; },
    end(data) { this.body = JSON.parse(data); }
  });

  // Connect to the database and create a test user and a product—just once for the entire file.
  t.before(async () => {
    await db.connect();

    //1. Create a test user to obtain a valid ID
    const userSeed = await db.query(
      "INSERT INTO users (name, email, password) VALUES ('Cart Tester', 'cart@test.com', 'password123') RETURNING id, role"
    );
    testUserId = userSeed.rows[0].id;

    // 2. Create a test item in the warehouse
    const productSeed = await db.query(
      "INSERT INTO products (title, price, stock) VALUES ('Cart Laptop', 1200.00, 5) RETURNING id"
    );
    testProductId = productSeed.rows[0].id;

    /// 3. Create a context (ctx) that simulates successful completion of authStage
    mockCtx = {
      user: { id: testUserId, role: userSeed.rows[0].role }
    };
  });

  // Clean up the global seed after all tests
  t.after(async () => {
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
    await db.disconnect();
  });

  //  Before each subtest, we open an isolated transaction
  t.beforeEach(async () => {
    await db.query('BEGIN');
  });

  // After each subtest, we completely revert the changes to the shopping cart
  t.afterEach(async () => {
    await db.query('ROLLBACK');
  });

  await t.test('addItem() should successfully add a new item to cart and return 200', async () => {
    const res = createMockResponse();
    // We simulate data from `validationStage` in `ctx.body`
    const ctx = {
      ...mockCtx,
      body: { productId: testProductId, quantity: 2 }
    };

    await cartHandler.addItem({}, res, {}, ctx);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Item added to cart successfully!');

    // Checking for physical availability in the database within a transaction
    const check = await db.query(
      'SELECT quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1 AND ci.product_id = $2',
      [testUserId, testProductId]
    );
    assert.strictEqual(check.rows[0].quantity, 2);
  });

  await t.test('addItem() should execute UPSERT and sum quantities on duplicate adds', async () => {
    const res1 = createMockResponse();
    const res2 = createMockResponse();
    const ctx = {
      ...mockCtx,
      body: { productId: testProductId, quantity: 1 }
    };

    // Add 1 item the first time
    await cartHandler.addItem({}, res1, {}, ctx);
    // Add 2 more items a second time (the `ON CONFLICT DO UPDATE` clause will take effect)
    ctx.body.quantity = 2;
    await cartHandler.addItem({}, res2, {}, ctx);

    // The total count in the database should be 3
    const check = await db.query(
      'SELECT quantity FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1 AND ci.product_id = $2',
      [testUserId, testProductId]
    );
    assert.strictEqual(check.rows[0].quantity, 3);
  });

  await t.test('addItem() should throw NotFoundError if product does not exist', async () => {
    const ctx = {
      ...mockCtx,
      body: { productId: 999999, quantity: 1 }
    };

    await assert.rejects(
      async () => {
        await cartHandler.addItem({}, createMockResponse(), {}, ctx);
      },
      (err) => err instanceof NotFoundError
    );
  });

  await t.test('getCart() should aggregate items and calculate correct total cart price', async () => {
    const res = createMockResponse();

    // First, we create a shopping cart and add an item using direct SQL within a transaction
    const cart = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [testUserId]);
    await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [cart.rows[0].id, testProductId, 2]);

    await cartHandler.getCart({}, res, {}, mockCtx);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.cart));
    assert.strictEqual(res.body.cart[0].product_id, testProductId);
    assert.strictEqual(res.body.cart[0].quantity, 2);
    // 2 штуки по 1200.00 = 2400.00
    assert.strictEqual(res.body.total_cart_price, 2400.00);
  });

  await t.test('removeItem() should successfully delete product from cart', async () => {
    const res = createMockResponse();

    // Add the item to the cart
    const cart = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [testUserId]);
    await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)', [cart.rows[0].id, testProductId, 1]);

    // Call the delete operation. Pass the product ID to `params`, just as the dynamic router does
    await cartHandler.removeItem({}, res, { productId: testProductId }, mockCtx);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Item removed from cart');

    // Check that the database is empty
    const check = await db.query('SELECT * FROM cart_items WHERE cart_id = $1', [cart.rows[0].id]);
    assert.strictEqual(check.rows.length, 0);
  });

  await t.test('removeItem() should throw NotFoundError if product is not in user cart', async () => {
    // Create a shopping cart, but leave it empty
    await db.query('INSERT INTO carts (user_id) VALUES ($1)', [testUserId]);

    await assert.rejects(
      async () => {
        await cartHandler.removeItem({}, createMockResponse(), { productId: testProductId }, mockCtx);
      },
      (err) => err instanceof NotFoundError
    );
  });

});

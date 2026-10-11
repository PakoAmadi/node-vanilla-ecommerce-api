'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/infrastructure/config/loadEnv')();
const db = require('../src/infrastructure/db/db');
const productHandler = require('../src/handlers/productHandler');
const { NotFoundError, ConflictError } = require('../src/interfaces/http/errors');

test('Product CRUD Handler Integration', async (t) => {

  const createMockResponse = () => ({
    statusCode: null,
    body: null,
    writeHead(status) { this.statusCode = status; },
    end(data) { this.body = JSON.parse(data); }
  });

  t.before(async () => {
    await db.connect();
    //await db.query('ALTER TABLE products ADD CONSTRAINT uk_products_title UNIQUE (title) ON CONFLICT DO NOTHING;');
  });

  t.after(async () => {
    await db.disconnect();
  });

  t.beforeEach(async () => {
    await db.query('BEGIN');
  });

  t.afterEach(async () => {
    await db.query('ROLLBACK');
  });

  await t.test('createOne() should successfully insert a product and return 201', async () => {
    const res = createMockResponse();
    const ctx = {
      body: { title: 'Test Laptop', description: 'Powerful CPU', price: 999.99, stock: 10 }
    };

    await productHandler.createOne({}, res, {}, ctx);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Product added successfully');
    assert.strictEqual(res.body.product.title, 'Test Laptop');
    assert.ok(res.body.product.id);
  });

  await t.test('createOne() should throw ConflictError on duplicate product title', async () => {
    const res = createMockResponse();
    const ctx = {
      body: { title: 'Unique Phone', description: 'Specs', price: 499.99, stock: 5 }
    };

    await productHandler.createOne({}, res, {}, ctx);

    await assert.rejects(
      async () => {
        await productHandler.createOne({}, createMockResponse(), {}, ctx);
      },
      (err) => err instanceof ConflictError
    );
  });

  await t.test('getAll() should return a list of products with status 200', async () => {
    const res = createMockResponse();

    await db.query(`INSERT INTO products (title, price) VALUES ('Book', 10.00)`);

    await productHandler.getAll({}, res, {}, {});

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.products));
    assert.ok(res.body.products.length >= 1);
  });

  await t.test('getOne() should return correct product data by dynamic ID', async () => {
    const res = createMockResponse();

    const seed = await db.query(`INSERT INTO products (title, price) VALUES ('Tablet', 299.99) RETURNING id`);
    const createdId = seed.rows[0].id;

    await productHandler.getOne({}, res, { id: createdId }, {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.title, 'Tablet');
    assert.strictEqual(Number(res.body.price), 299.99);
  });

  await t.test('getOne() should throw NotFoundError for non-existing product ID', async () => {
    await assert.rejects(
      async () => {
        await productHandler.getOne({}, createMockResponse(), { id: 999999 }, {});
      },
      (err) => err instanceof NotFoundError
    );
  });

  await t.test('updateOne() should successfully update fields of an existing product', async () => {
    const res = createMockResponse();

    const seed = await db.query(`INSERT INTO products (title, price) VALUES ('Old Title', 50.00) RETURNING id`);
    const createdId = seed.rows[0].id;

    const ctx = {
      body: { title: 'New Title', description: 'Updated', price: 75.50, stock: 20 }
    };

    await productHandler.updateOne({}, res, { id: createdId }, ctx);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.product.title, 'New Title');
    assert.strictEqual(Number(res.body.product.price), 75.50);
  });

  await t.test('deleteOne() should delete item from DB and return 200', async () => {
    const res = createMockResponse();

    const seed = await db.query(`INSERT INTO products (title, price) VALUES ('To Delete', 5.00) RETURNING id`);
    const createdId = seed.rows[0].id;

    await productHandler.deleteOne({}, res, { id: createdId }, {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Product deleted successfully!');

    const check = await db.query(`SELECT id FROM products WHERE id = $1`, [createdId]);
    assert.strictEqual(check.rows.length, 0);
  });

  await t.test('deleteOne() should throw NotFoundError if product does not exist', async () => {
    await assert.rejects(
      async () => {
        await productHandler.deleteOne({}, createMockResponse(), { id: 999999 }, {});
      },
      (err) => err instanceof NotFoundError
    );
  });

});

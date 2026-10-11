'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/infrastructure/config/loadEnv')();
const db = require('../src/infrastructure/db/db');
const createContainer = require('../src/container');
const RouterDispatcher = require('../src/interfaces/http/router/RouterDispatcher');
const {generateToken} = require('../src/infrastructure/security/jwt');
const {ProductNotFoundError, ProductTitleTakenError, InvalidProductError} = require('../src/domain/errors');

/**
 * Integration suite for the products module.
 * Real chain: controller -> use case -> PgProductRepository -> PostgreSQL.
 */
test('Products Integration Suite (PostgreSQL)', async (t) => {
  const suffix = `${process.pid}_${Date.now()}`;
  const title = (label) => `${label} ${suffix}`;
  let product; // container.controllers.product

  const createMockResponse = () => ({
    statusCode: null,
    body: null,
    headersSent: false,
    writeHead(status) { this.statusCode = status; this.headersSent = true; },
    end(data) { this.body = JSON.parse(data); }
  });

  t.before(async () => {
    await db.connect();
    product = createContainer({db}).controllers.product;
  });

  t.after(async () => {
    await db.query('DELETE FROM products WHERE title LIKE $1', [`% ${suffix}`]);
    await db.disconnect();
  });

  const create = async (label, extra = {}) => {
    const res = createMockResponse();
    await product.createOne({}, res, {}, {body: {title: title(label), description: 'Desc', price: 999.99, stock: 10, ...extra}});
    return res;
  };

  await t.test('createOne should insert a product and return 201 with full record', async () => {
    const res = await create('Laptop');
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Product added successfully');
    assert.strictEqual(res.body.product.title, title('Laptop'));
    assert.strictEqual(res.body.product.price, '999.99');
    assert.ok(Number.isInteger(res.body.product.id));
    assert.ok(res.body.product.created_at);
  });

  await t.test('createOne should throw ProductTitleTakenError on duplicate title', async () => {
    await create('Phone');
    await assert.rejects(create('Phone'), (e) =>
      e instanceof ProductTitleTakenError && e.message === 'Product with this name already exists');
  });

  await t.test('createOne should reject invalid data without writing', async () => {
    await assert.rejects(create('Invalid', {price: -1}), InvalidProductError);
    const {rowCount} = await db.query('SELECT 1 FROM products WHERE title = $1', [title('Invalid')]);
    assert.strictEqual(rowCount, 0);
  });

  await t.test('getAll should list products newest first', async () => {
    const a = (await create('List A')).body.product.id;
    const b = (await create('List B')).body.product.id;
    const res = createMockResponse();
    await product.getAll({}, res, {}, {});
    assert.strictEqual(res.statusCode, 200);
    const ids = res.body.products.map(p => p.id);
    assert.ok(ids.indexOf(b) < ids.indexOf(a));
    assert.deepStrictEqual(Object.keys(res.body.products[0]).sort(),
      ['description', 'id', 'image_url', 'price', 'stock', 'title']);
  });

  await t.test('getOne should return the product by id', async () => {
    const {id} = (await create('Tablet', {price: 299.99})).body.product;
    const res = createMockResponse();
    await product.getOne({}, res, {id: String(id)}, {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.title, title('Tablet'));
    assert.strictEqual(Number(res.body.price), 299.99);
  });

  await t.test('getOne should throw ProductNotFoundError for missing id', async () => {
    await assert.rejects(product.getOne({}, createMockResponse(), {id: '999999999'}, {}), ProductNotFoundError);
  });

  await t.test('updateOne should replace fields', async () => {
    const {id} = (await create('Old')).body.product;
    const res = createMockResponse();
    await product.updateOne({}, res, {id: String(id)},
      {body: {title: title('New'), description: 'Updated', price: 75.5, stock: 20}});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Product updated successfully');
    assert.strictEqual(res.body.product.title, title('New'));
    assert.strictEqual(Number(res.body.product.price), 75.5);
  });

  await t.test('updateOne should throw ProductNotFoundError (was 500 before refactoring)', async () => {
    await assert.rejects(
      product.updateOne({}, createMockResponse(), {id: '999999999'},
        {body: {title: title('Ghost'), price: 1, stock: 1}}),
      ProductNotFoundError
    );
  });

  await t.test('updateOne should throw ProductTitleTakenError when renaming to an existing title', async () => {
    await create('Taken');
    const {id} = (await create('Rename Me')).body.product;
    await assert.rejects(
      product.updateOne({}, createMockResponse(), {id: String(id)}, {body: {title: title('Taken'), price: 1, stock: 1}}),
      ProductTitleTakenError
    );
  });

  await t.test('deleteOne should delete and then report not found', async () => {
    const {id} = (await create('To Delete')).body.product;
    const res = createMockResponse();
    await product.deleteOne({}, res, {id: String(id)}, {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Product deleted successfully!');
    await assert.rejects(product.deleteOne({}, createMockResponse(), {id: String(id)}, {}), ProductNotFoundError);
  });

  await t.test('HTTP: full CRUD through router, admin guard and validation stage', async () => {
    const router = require('../src/interfaces/http/routes');
    const dispatcher = new RouterDispatcher(router);
    const secret = process.env.JWT_TOKEN_SECRET || 'super_secret_key';
    const adminToken = generateToken({id: 1, role: 'admin'}, secret);
    const customerToken = generateToken({id: 2, role: 'customer'}, secret);

    const call = async (method, url, {token, body} = {}) => {
      const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
      const req = {
        method, url, headers: token ? {authorization: `Bearer ${token}`} : {},
        async *[Symbol.asyncIterator]() { yield* payload; }
      };
      const res = createMockResponse();
      await dispatcher.dispatch(req, res);
      return res;
    };

    const created = await call('POST', '/api/products',
      {token: adminToken, body: {title: title('HTTP Book'), description: 'd', price: '12.50', stock: '3'}});
    assert.strictEqual(created.statusCode, 201, 'POST via HTTP used to fail with 500 (no body parsing)');
    const id = created.body.product.id;

    const updated = await call('PUT', `/api/products/${id}`,
      {token: adminToken, body: {title: title('HTTP Book 2'), price: 15, stock: 4}});
    assert.strictEqual(updated.statusCode, 200);
    assert.strictEqual(updated.body.product.stock, 4);

    const invalid = await call('POST', '/api/products', {token: adminToken, body: {title: '', price: -1, stock: 1}});
    assert.strictEqual(invalid.statusCode, 400);
    assert.deepStrictEqual(Object.keys(invalid.body.details).sort(), ['price', 'title']);

    assert.strictEqual((await call('POST', '/api/products',
      {token: customerToken, body: {title: title('Nope'), price: 1, stock: 1}})).statusCode, 403);
    assert.strictEqual((await call('POST', '/api/products', {body: {}})).statusCode, 401);

    assert.strictEqual((await call('GET', `/api/products/${id}`)).statusCode, 200);
    assert.strictEqual((await call('GET', '/api/products/abc')).statusCode, 400);
    assert.strictEqual((await call('GET', '/api/products/999999999')).statusCode, 404);

    assert.strictEqual((await call('DELETE', `/api/products/${id}`, {token: adminToken})).statusCode, 200);
    assert.strictEqual((await call('DELETE', `/api/products/${id}`, {token: adminToken})).statusCode, 404);
  });
});

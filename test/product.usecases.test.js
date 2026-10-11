'use strict';

const test = require('node:test');
const assert = require('node:assert');
const makeProductUseCases = require('../src/application/products/productUseCases');
const {ProductNotFoundError, InvalidProductError, InvalidProductIdError} = require('../src/domain/errors');

const createFakeRepo = () => {
  const rows = new Map();
  let nextId = 1;
  return {
    rows,
    findAll: async () => [...rows.values()].reverse(),
    findById: async (id) => rows.get(id) ?? null,
    create: async (data) => { const r = {id: nextId++, ...data}; rows.set(r.id, r); return r; },
    update: async (id, data) => (rows.has(id) ? (rows.set(id, {id, ...data}), rows.get(id)) : null),
    delete: async (id) => rows.delete(id)
  };
};

test('Product use cases (unit, fake repository)', async (t) => {
  const data = {title: 'Book', description: null, price: 10, stock: 2};

  await t.test('create -> get -> list', async () => {
    const repo = createFakeRepo();
    const uc = makeProductUseCases({products: repo});
    const created = await uc.createProduct(data);
    assert.deepStrictEqual(await uc.getProduct({productId: String(created.id)}), created);
    assert.strictEqual((await uc.listProducts()).length, 1);
  });

  await t.test('createProduct should validate before touching the repository', async () => {
    const repo = createFakeRepo();
    await assert.rejects(makeProductUseCases({products: repo}).createProduct({...data, price: -5}), InvalidProductError);
    assert.strictEqual(repo.rows.size, 0);
  });

  await t.test('update and delete should throw ProductNotFoundError for missing id', async () => {
    const uc = makeProductUseCases({products: createFakeRepo()});
    await assert.rejects(uc.updateProduct({productId: 5, ...data}), (e) =>
      e instanceof ProductNotFoundError && e.message === 'Product with ID 5 not found');
    await assert.rejects(uc.deleteProduct({productId: 5}), ProductNotFoundError);
    await assert.rejects(uc.getProduct({productId: 5}), ProductNotFoundError);
  });

  await t.test('invalid id should be rejected for get/update/delete', async () => {
    const uc = makeProductUseCases({products: createFakeRepo()});
    await assert.rejects(uc.getProduct({productId: 'x'}), InvalidProductIdError);
    await assert.rejects(uc.updateProduct({productId: 'x', ...data}), InvalidProductIdError);
    await assert.rejects(uc.deleteProduct({productId: 'x'}), InvalidProductIdError);
  });

  await t.test('updateProduct should replace fields', async () => {
    const repo = createFakeRepo();
    const uc = makeProductUseCases({products: repo});
    const {id} = await uc.createProduct(data);
    const updated = await uc.updateProduct({productId: id, ...data, title: 'New', stock: 9});
    assert.strictEqual(updated.title, 'New');
    assert.strictEqual(updated.stock, 9);
  });
});

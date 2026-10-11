'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Product = require('../src/domain/product/Product');
const {InvalidProductError, InvalidProductIdError} = require('../src/domain/errors');

test('Product rules (unit, no database)', async (t) => {
  const valid = {title: '  Laptop ', description: 'Fast', price: 999.99, stock: 10};

  await t.test('validate() should accept valid data and trim title', () => {
    assert.deepStrictEqual(Product.validate(valid), {title: 'Laptop', description: 'Fast', price: 999.99, stock: 10});
  });

  await t.test('validate() should default missing description to null', () => {
    assert.strictEqual(Product.validate({...valid, description: undefined}).description, null);
  });

  await t.test('validate() should accept zero price and zero stock', () => {
    assert.doesNotThrow(() => Product.validate({...valid, price: 0, stock: 0}));
  });

  await t.test('validate() should collect all field errors at once', () => {
    assert.throws(
      () => Product.validate({title: ' ', description: 5, price: -1, stock: 1.5}),
      (err) => err instanceof InvalidProductError &&
        Object.keys(err.details).sort().join() === 'description,price,stock,title'
    );
  });

  await t.test('validate() should reject price with more than 2 decimals and non-numbers', () => {
    for (const price of [10.555, '10', NaN, Infinity, undefined]) {
      assert.throws(() => Product.validate({...valid, price}), (e) => 'price' in e.details, String(price));
    }
  });

  await t.test('validate() should reject too long title', () => {
    assert.throws(() => Product.validate({...valid, title: 'x'.repeat(256)}), (e) => 'title' in e.details);
  });

  await t.test('parseId() should accept positive integers and reject garbage', () => {
    assert.strictEqual(Product.parseId('7'), 7);
    for (const bad of ['abc', '0', -1, 1.2, null]) {
      assert.throws(() => Product.parseId(bad), InvalidProductIdError);
    }
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Cart = require('../src/domain/cart/Cart');
const {toCents, fromCents} = require('../src/domain/money');
const {InsufficientStockError, InvalidProductIdError, InvalidQuantityError} = require('../src/domain/errors');

test('Cart rules and money (unit, no database)', async (t) => {
  await t.test('money: toCents/fromCents should handle NUMERIC strings and rounding', () => {
    assert.strictEqual(toCents('10.50'), 1050);
    assert.strictEqual(toCents(0.1) + toCents(0.2), 30);
    assert.strictEqual(fromCents(30), 0.3);
  });

  await t.test('parseProductId() should accept positive integers and numeric strings', () => {
    assert.strictEqual(Cart.parseProductId(5), 5);
    assert.strictEqual(Cart.parseProductId('42'), 42);
  });

  await t.test('parseProductId() should reject garbage', () => {
    for (const bad of ['abc', '1.5', '-1', '0', 0, -3, 1.5, null, undefined, '', '12abc', NaN]) {
      assert.throws(() => Cart.parseProductId(bad), InvalidProductIdError, `value: ${String(bad)}`);
    }
  });

  await t.test('assertCanAdd() should take quantity already in cart into account', () => {
    assert.doesNotThrow(() => Cart.assertCanAdd({stock: 3, inCart: 0, requested: 3}));
    assert.doesNotThrow(() => Cart.assertCanAdd({stock: 3, inCart: 2, requested: 1}));
    assert.throws(
      () => Cart.assertCanAdd({stock: 3, inCart: 2, requested: 2}),
      (err) => err instanceof InsufficientStockError && err.message === 'Not enough stock available'
    );
  });

  await t.test('assertCanAdd() should reject non-positive or fractional quantity', () => {
    for (const bad of [0, -1, 1.5, NaN, undefined]) {
      assert.throws(() => Cart.assertCanAdd({stock: 10, inCart: 0, requested: bad}), InvalidQuantityError);
    }
  });

  await t.test('summarize() should compute item and total prices in cents', () => {
    const {items, totalPrice} = Cart.summarize([
      {productId: 1, price: '0.10', quantity: 1},
      {productId: 2, price: '0.20', quantity: 1},
      {productId: 3, price: '19.99', quantity: 3}
    ]);
    assert.deepStrictEqual(items.map(i => i.totalItemPrice), [0.1, 0.2, 59.97]);
    assert.strictEqual(totalPrice, 60.27);
  });

  await t.test('summarize() should return zero total for an empty cart', () => {
    assert.deepStrictEqual(Cart.summarize([]), {items: [], totalPrice: 0});
  });
});

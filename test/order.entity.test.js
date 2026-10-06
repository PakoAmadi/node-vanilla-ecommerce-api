'use strict';

const test = require('node:test');
const assert = require('node:assert');
const Order = require('../src/domain/order/Order');
const {EmptyCartError, InsufficientStockError} = require('../src/domain/errors');

test('Order entity (unit, no database)', async (t) => {
  const item = (overrides = {}) => ({productId: 1, title: 'Book', price: '10.00', quantity: 1, stock: 5, ...overrides});

  await t.test('placeFrom() should calculate total price and snapshot items', () => {
    const order = Order.placeFrom(7, [item({quantity: 2}), item({productId: 2, title: 'Pen', price: '0.10', quantity: 3})]);

    assert.strictEqual(order.userId, 7);
    assert.strictEqual(order.status, 'paid');
    assert.strictEqual(order.totalPrice, 20.30);
    assert.deepStrictEqual(order.items, [
      {productId: 1, title: 'Book', price: 10, quantity: 2},
      {productId: 2, title: 'Pen', price: 0.1, quantity: 3}
    ]);
    assert.strictEqual(order.id, null);
  });

  await t.test('placeFrom() should not suffer from floating point drift', () => {
    const order = Order.placeFrom(1, [item({price: '0.10'}), item({productId: 2, price: '0.20'})]);
    assert.strictEqual(order.totalPrice, 0.3);
  });

  await t.test('placeFrom() should reject an empty cart', () => {
    assert.throws(() => Order.placeFrom(1, []), EmptyCartError);
    assert.throws(() => Order.placeFrom(1, undefined), EmptyCartError);
  });

  await t.test('placeFrom() should reject when stock is insufficient', () => {
    assert.throws(
      () => Order.placeFrom(1, [item({title: 'Rare', quantity: 3, stock: 2})]),
      (err) => err instanceof InsufficientStockError && err.message === 'Not enough stock for product: Rare. Available: 2'
    );
  });

  await t.test('placeFrom() should allow buying exactly the remaining stock', () => {
    const order = Order.placeFrom(1, [item({quantity: 5, stock: 5})]);
    assert.strictEqual(order.totalPrice, 50);
  });

  await t.test('withPersistence() should return a new instance with id and createdAt', () => {
    const order = Order.placeFrom(1, [item()]);
    const createdAt = new Date();
    const saved = order.withPersistence({id: 42, createdAt});

    assert.notStrictEqual(saved, order);
    assert.strictEqual(saved.id, 42);
    assert.strictEqual(saved.createdAt, createdAt);
    assert.strictEqual(order.id, null);
  });
});

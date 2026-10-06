'use strict';

const test = require('node:test');
const assert = require('node:assert');
const makeCheckout = require('../src/application/orders/checkout');
const makeGetOrderHistory = require('../src/application/orders/getOrderHistory');
const {EmptyCartError, InsufficientStockError} = require('../src/domain/errors');

/**
 * In-memory fakes for the ports. Writes are staged and applied only on commit,
 * so the tests can verify that a failed use case leaves no side effects.
 */
const createFakeUow = ({cartItems = []} = {}) => {
  const state = {committed: false, rolledBack: false, savedOrders: [], stockDecreases: [], clearedCarts: []};

  const uow = {
    async run(work) {
      const staged = {savedOrders: [], stockDecreases: [], clearedCarts: []};
      const repos = {
        carts: {
          getItemsForCheckout: async () => cartItems,
          clear: async (userId) => { staged.clearedCarts.push(userId); }
        },
        products: {
          decreaseStock: async (items) => { staged.stockDecreases.push(...items); }
        },
        orders: {
          save: async (order) => {
            staged.savedOrders.push(order);
            return {id: 100, createdAt: new Date('2026-01-01T00:00:00Z')};
          }
        }
      };
      try {
        const result = await work(repos);
        Object.assign(state, staged, {committed: true});
        return result;
      } catch (error) {
        state.rolledBack = true;
        throw error;
      }
    }
  };
  return {uow, state};
};

test('Orders use cases (unit, fake repositories)', async (t) => {
  await t.test('checkout should save order, decrease stock and clear the cart atomically', async () => {
    const {uow, state} = createFakeUow({
      cartItems: [{productId: 1, title: 'Book', price: '50.00', quantity: 2, stock: 3}]
    });

    const order = await makeCheckout({uow})({userId: 5});

    assert.strictEqual(order.id, 100);
    assert.strictEqual(order.totalPrice, 100);
    assert.strictEqual(state.committed, true);
    assert.strictEqual(state.savedOrders.length, 1);
    assert.deepStrictEqual(state.stockDecreases.map(i => [i.productId, i.quantity]), [[1, 2]]);
    assert.deepStrictEqual(state.clearedCarts, [5]);
  });

  await t.test('checkout should fail with EmptyCartError and leave no side effects', async () => {
    const {uow, state} = createFakeUow({cartItems: []});

    await assert.rejects(makeCheckout({uow})({userId: 5}), EmptyCartError);
    assert.strictEqual(state.rolledBack, true);
    assert.strictEqual(state.committed, false);
    assert.strictEqual(state.savedOrders.length, 0);
    assert.strictEqual(state.clearedCarts.length, 0);
  });

  await t.test('checkout should fail with InsufficientStockError and leave no side effects', async () => {
    const {uow, state} = createFakeUow({
      cartItems: [{productId: 1, title: 'Book', price: '50.00', quantity: 4, stock: 3}]
    });

    await assert.rejects(makeCheckout({uow})({userId: 5}), InsufficientStockError);
    assert.strictEqual(state.rolledBack, true);
    assert.strictEqual(state.stockDecreases.length, 0);
  });

  await t.test('getOrderHistory should delegate to the repository with the user id', async () => {
    let requestedUserId;
    const orders = {findHistoryByUser: async (userId) => { requestedUserId = userId; return [{id: 1}]; }};

    const history = await makeGetOrderHistory({orders})({userId: 9});

    assert.strictEqual(requestedUserId, 9);
    assert.deepStrictEqual(history, [{id: 1}]);
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const makeGetCart = require('../src/application/cart/getCart');
const makeAddItemToCart = require('../src/application/cart/addItemToCart');
const makeRemoveItemFromCart = require('../src/application/cart/removeItemFromCart');
const {
  ProductNotFoundError, InsufficientStockError, CartItemNotFoundError, InvalidProductIdError
} = require('../src/domain/errors');

// In-memory implementation of the cart/product ports
const createFakeStore = ({stock = {}, cart = {}} = {}) => {
  const state = {stock: {...stock}, cart: {...cart}, cartCreated: false, transactions: 0};
  const carts = {
    getOrCreateCartId: async () => { state.cartCreated = true; return 1; },
    getItemQuantity: async (cartId, productId) => state.cart[productId] ?? 0,
    addQuantity: async (cartId, productId, q) => { state.cart[productId] = (state.cart[productId] ?? 0) + q; },
    removeItem: async (userId, productId) => {
      if (!(productId in state.cart)) return false;
      delete state.cart[productId];
      return true;
    },
    findItemsByUser: async () => Object.entries(state.cart).map(([productId, quantity], i) => ({
      itemId: i + 1, productId: Number(productId), title: `P${productId}`, price: '2.50', quantity
    }))
  };
  const products = {findStockById: async (id) => (id in state.stock ? state.stock[id] : null)};
  const uow = {run: async (work) => { state.transactions++; return work({carts, products}); }};
  return {state, carts, products, uow};
};

test('Cart use cases (unit, fake repositories)', async (t) => {
  await t.test('addItemToCart should add within one transaction', async () => {
    const store = createFakeStore({stock: {7: 5}});
    await makeAddItemToCart({uow: store.uow})({userId: 1, productId: 7, quantity: 2});
    assert.deepStrictEqual(store.state.cart, {7: 2});
    assert.strictEqual(store.state.transactions, 1);
  });

  await t.test('addItemToCart should sum with quantity already in cart', async () => {
    const store = createFakeStore({stock: {7: 5}, cart: {7: 3}});
    await makeAddItemToCart({uow: store.uow})({userId: 1, productId: 7, quantity: 2});
    assert.deepStrictEqual(store.state.cart, {7: 5});
  });

  await t.test('addItemToCart should reject exceeding stock and leave cart unchanged', async () => {
    const store = createFakeStore({stock: {7: 5}, cart: {7: 4}});
    await assert.rejects(
      makeAddItemToCart({uow: store.uow})({userId: 1, productId: 7, quantity: 2}),
      InsufficientStockError
    );
    assert.deepStrictEqual(store.state.cart, {7: 4});
  });

  await t.test('addItemToCart should throw ProductNotFoundError before creating a cart', async () => {
    const store = createFakeStore();
    await assert.rejects(
      makeAddItemToCart({uow: store.uow})({userId: 1, productId: 99, quantity: 1}),
      ProductNotFoundError
    );
    assert.strictEqual(store.state.cartCreated, false);
  });

  await t.test('addItemToCart should reject invalid product id without opening a transaction', async () => {
    const store = createFakeStore();
    await assert.rejects(
      makeAddItemToCart({uow: store.uow})({userId: 1, productId: 'abc', quantity: 1}),
      InvalidProductIdError
    );
    assert.strictEqual(store.state.transactions, 0);
  });

  await t.test('getCart should return items with totals', async () => {
    const store = createFakeStore({cart: {1: 2, 2: 1}});
    const result = await makeGetCart({carts: store.carts})({userId: 1});
    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.totalPrice, 7.5);
  });

  await t.test('removeItemFromCart should remove an existing item', async () => {
    const store = createFakeStore({cart: {3: 1}});
    await makeRemoveItemFromCart({carts: store.carts})({userId: 1, productId: '3'});
    assert.deepStrictEqual(store.state.cart, {});
  });

  await t.test('removeItemFromCart should throw CartItemNotFoundError for missing item', async () => {
    const store = createFakeStore();
    await assert.rejects(
      makeRemoveItemFromCart({carts: store.carts})({userId: 1, productId: 3}),
      CartItemNotFoundError
    );
  });

  await t.test('removeItemFromCart should reject invalid product id', async () => {
    const store = createFakeStore();
    await assert.rejects(
      makeRemoveItemFromCart({carts: store.carts})({userId: 1, productId: 'abc'}),
      InvalidProductIdError
    );
  });
});

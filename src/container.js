'use strict';

// Composition Root: the only place where concrete implementations
// are wired to the use cases that depend on abstractions.

const PgUnitOfWork = require('./infrastructure/db/PgUnitOfWork');
const PgOrderRepository = require('./infrastructure/db/repositories/PgOrderRepository');
const PgCartRepository = require('./infrastructure/db/repositories/PgCartRepository');
const makeCheckout = require('./application/orders/checkout');
const makeGetOrderHistory = require('./application/orders/getOrderHistory');
const makeGetCart = require('./application/cart/getCart');
const makeAddItemToCart = require('./application/cart/addItemToCart');
const makeRemoveItemFromCart = require('./application/cart/removeItemFromCart');
const makeOrderController = require('./interfaces/http/controllers/orderController');
const makeCartController = require('./interfaces/http/controllers/cartController');

/**
 * @param {object} deps
 * @param {import('./database/db')} deps.db
 */
const createContainer = ({db}) => {
  const uow = new PgUnitOfWork(db);
  // Non-transactional repositories for single-statement operations
  const orderReadRepository = new PgOrderRepository(db);
  const cartRepository = new PgCartRepository(db);

  const checkout = makeCheckout({uow});
  const getOrderHistory = makeGetOrderHistory({orders: orderReadRepository});

  const getCart = makeGetCart({carts: cartRepository});
  const addItemToCart = makeAddItemToCart({uow});
  const removeItemFromCart = makeRemoveItemFromCart({carts: cartRepository});

  return {
    useCases: {checkout, getOrderHistory, getCart, addItemToCart, removeItemFromCart},
    controllers: {
      order: makeOrderController({checkout, getOrderHistory}),
      cart: makeCartController({getCart, addItemToCart, removeItemFromCart})
    }
  };
};

module.exports = createContainer;

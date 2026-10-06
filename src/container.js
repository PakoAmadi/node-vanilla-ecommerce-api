'use strict';

// Composition Root: the only place where concrete implementations
// are wired to the use cases that depend on abstractions.

const PgUnitOfWork = require('./infrastructure/db/PgUnitOfWork');
const PgOrderRepository = require('./infrastructure/db/repositories/PgOrderRepository');
const makeCheckout = require('./application/orders/checkout');
const makeGetOrderHistory = require('./application/orders/getOrderHistory');
const makeOrderController = require('./interfaces/http/controllers/orderController');

/**
 * @param {object} deps
 * @param {import('./database/db')} deps.db
 */
const createContainer = ({db}) => {
  const uow = new PgUnitOfWork(db);
  const orderReadRepository = new PgOrderRepository(db);

  const checkout = makeCheckout({uow});
  const getOrderHistory = makeGetOrderHistory({orders: orderReadRepository});

  return {
    useCases: {checkout, getOrderHistory},
    controllers: {
      order: makeOrderController({checkout, getOrderHistory})
    }
  };
};

module.exports = createContainer;

'use strict';

/**
 * Use case: list the user's orders, newest first.
 *
 * @param {object} deps
 * @param {Pick<import('./ports').OrderRepository, 'findHistoryByUser'>} deps.orders
 */
const makeGetOrderHistory = ({orders}) => async ({userId}) => {
  return orders.findHistoryByUser(userId);
};

module.exports = makeGetOrderHistory;

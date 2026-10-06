'use strict';

const Order = require('../../domain/order/Order');

/**
 * Use case: convert the user's cart into a paid order.
 *
 * @param {object} deps
 * @param {import('./ports').UnitOfWork} deps.uow
 */
const makeCheckout = ({uow}) => async ({userId}) => {
  return uow.run(async ({carts, products, orders}) => {
    const cartItems = await carts.getItemsForCheckout(userId);

    const order = Order.placeFrom(userId, cartItems);

    const persisted = await orders.save(order);
    await products.decreaseStock(order.items);
    await carts.clear(userId);

    return order.withPersistence(persisted);
  });
};

module.exports = makeCheckout;

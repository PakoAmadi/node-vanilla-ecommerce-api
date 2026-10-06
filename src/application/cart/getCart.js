'use strict';

const Cart = require('../../domain/cart/Cart');

/**
 * Use case: show the user's cart with per-item and total prices.
 * @param {{carts: Pick<import('./ports').CartRepository, 'findItemsByUser'>}} deps
 */
const makeGetCart = ({carts}) => async ({userId}) => {
  const items = await carts.findItemsByUser(userId);
  return Cart.summarize(items);
};

module.exports = makeGetCart;

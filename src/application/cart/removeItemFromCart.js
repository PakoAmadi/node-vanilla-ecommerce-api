'use strict';

const Cart = require('../../domain/cart/Cart');
const {CartItemNotFoundError} = require('../../domain/errors');

/**
 * Use case: remove a product from the user's cart.
 * @param {{carts: Pick<import('./ports').CartRepository, 'removeItem'>}} deps
 */
const makeRemoveItemFromCart = ({carts}) => async ({userId, productId}) => {
  const id = Cart.parseProductId(productId);
  const removed = await carts.removeItem(userId, id);
  if (!removed) throw new CartItemNotFoundError();
};

module.exports = makeRemoveItemFromCart;

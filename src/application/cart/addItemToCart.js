'use strict';

const Cart = require('../../domain/cart/Cart');
const {ProductNotFoundError} = require('../../domain/errors');

/**
 * Use case: add a product to the cart (or increase its quantity).
 * Runs in one transaction; the cart row lock makes concurrent adds of
 * the same user sequential, so the stock rule sees an up-to-date quantity.
 *
 * @param {{uow: import('../orders/ports').UnitOfWork}} deps
 */
const makeAddItemToCart = ({uow}) => async ({userId, productId, quantity}) => {
  const id = Cart.parseProductId(productId);

  return uow.run(async ({carts, products}) => {
    const stock = await products.findStockById(id);
    if (stock === null) throw new ProductNotFoundError();

    const cartId = await carts.getOrCreateCartId(userId);
    const inCart = await carts.getItemQuantity(cartId, id);

    Cart.assertCanAdd({stock, inCart, requested: quantity});

    await carts.addQuantity(cartId, id, quantity);
  });
};

module.exports = makeAddItemToCart;

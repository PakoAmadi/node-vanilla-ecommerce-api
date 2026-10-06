'use strict';

const {presentCart, presentItemAdded, presentItemRemoved} = require('../presenters/cartPresenter');

/**
 * Thin HTTP adapter for the cart use cases.
 * Body is already sanitized and validated by validationStage (ctx.body).
 */
const makeCartController = ({getCart, addItemToCart, removeItemFromCart}) => ({
  async getCart(req, res, params, ctx) {
    const cart = await getCart({userId: ctx.user.id});
    res.writeHead(200);
    res.end(JSON.stringify(presentCart(cart)));
  },

  async addItem(req, res, params, ctx) {
    const {productId, quantity} = ctx.body;
    await addItemToCart({userId: ctx.user.id, productId, quantity});
    res.writeHead(200);
    res.end(JSON.stringify(presentItemAdded()));
  },

  async removeItem(req, res, params, ctx) {
    await removeItemFromCart({userId: ctx.user.id, productId: params.productId});
    res.writeHead(200);
    res.end(JSON.stringify(presentItemRemoved()));
  }
});

module.exports = makeCartController;

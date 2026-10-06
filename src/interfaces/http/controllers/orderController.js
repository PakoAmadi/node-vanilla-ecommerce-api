'use strict';

const {presentPlacedOrder, presentOrderHistory} = require('../presenters/orderPresenter');

/**
 * Thin HTTP adapter: takes data from ctx, calls a use case, writes the response.
 * No SQL and no business rules here.
 *
 * @param {object} useCases
 * @param {(input:{userId:number}) => Promise<import('../../../domain/order/Order')>} useCases.checkout
 * @param {(input:{userId:number}) => Promise<object[]>} useCases.getOrderHistory
 */
const makeOrderController = ({checkout, getOrderHistory}) => ({
  async checkout(req, res, params, ctx) {
    const order = await checkout({userId: ctx.user.id});
    res.writeHead(201);
    res.end(JSON.stringify(presentPlacedOrder(order)));
  },

  async getHistory(req, res, params, ctx) {
    const orders = await getOrderHistory({userId: ctx.user.id});
    res.writeHead(200);
    res.end(JSON.stringify(presentOrderHistory(orders)));
  }
});

module.exports = makeOrderController;

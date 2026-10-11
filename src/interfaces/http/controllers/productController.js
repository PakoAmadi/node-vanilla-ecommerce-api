'use strict';

const presenter = require('../presenters/productPresenter');

const send = (res, status, body) => {
  res.writeHead(status);
  res.end(JSON.stringify(body));
};

/**
 * @param {ReturnType<import('../../../application/products/productUseCases')>} useCases
 */
const makeProductController = (useCases) => ({
  async getAll(req, res) {
    send(res, 200, presenter.presentProductList(await useCases.listProducts()));
  },

  async getOne(req, res, params) {
    send(res, 200, presenter.presentProduct(await useCases.getProduct({productId: params.id})));
  },

  async createOne(req, res, params, ctx) {
    send(res, 201, presenter.presentProductCreated(await useCases.createProduct(ctx.body)));
  },

  async updateOne(req, res, params, ctx) {
    const product = await useCases.updateProduct({...ctx.body, productId: params.id});
    send(res, 200, presenter.presentProductUpdated(product));
  },

  async deleteOne(req, res, params) {
    await useCases.deleteProduct({productId: params.id});
    send(res, 200, presenter.presentProductDeleted());
  }
});

module.exports = makeProductController;

'use strict';

const Product = require('../../domain/product/Product');
const {ProductNotFoundError} = require('../../domain/errors');

/**
 * Catalog use cases. They are small, so they share one factory;
 * each returned function is an independent use case.
 *
 * @param {{products: import('./ports').ProductCatalogRepository}} deps
 */
const makeProductUseCases = ({products}) => ({
  async listProducts() {
    return products.findAll();
  },

  async getProduct({productId}) {
    const id = Product.parseId(productId);
    const product = await products.findById(id);
    if (!product) throw ProductNotFoundError.forId(id);
    return product;
  },

  async createProduct(input) {
    return products.create(Product.validate(input));
  },

  async updateProduct({productId, ...input}) {
    const id = Product.parseId(productId);
    const updated = await products.update(id, Product.validate(input));
    if (!updated) throw ProductNotFoundError.forId(id);
    return updated;
  },

  async deleteProduct({productId}) {
    const id = Product.parseId(productId);
    const deleted = await products.delete(id);
    if (!deleted) throw ProductNotFoundError.forId(id);
  }
});

module.exports = makeProductUseCases;

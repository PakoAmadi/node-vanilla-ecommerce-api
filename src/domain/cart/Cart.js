'use strict';

const {InsufficientStockError, InvalidProductIdError, InvalidQuantityError} = require('../errors');
const {toCents, fromCents} = require('../money');

const STOCK_ERROR_MESSAGE = 'Not enough stock available';

/**
 * Cart business rules. Stateless: the cart itself is stored by the repository,
 * this module only decides what is allowed and how totals are calculated.
 */
const Cart = {
  /**
   * @param {unknown} value raw id (body or URL param)
   * @returns {number} positive integer id
   */
  parseProductId(value) {
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(id) || id <= 0) throw new InvalidProductIdError();
    return id;
  },

  /**
   * Rule: quantity already in the cart + requested quantity must not exceed stock.
   * @param {{stock:number, inCart:number, requested:number}} input
   */
  assertCanAdd({stock, inCart, requested}) {
    if (!Number.isSafeInteger(requested) || requested <= 0) {
      throw new InvalidQuantityError();
    }
    if (inCart + requested > stock) {
      throw new InsufficientStockError(STOCK_ERROR_MESSAGE);
    }
  },

  /**
   * @param {Array<{price:number|string, quantity:number}>} items
   * @returns {{items:Array<object>, totalPrice:number}} items enriched with totalItemPrice
   */
  summarize(items) {
    let totalCents = 0;
    const enriched = items.map((item) => {
      const itemCents = toCents(item.price) * item.quantity;
      totalCents += itemCents;
      return {...item, totalItemPrice: fromCents(itemCents)};
    });
    return {items: enriched, totalPrice: fromCents(totalCents)};
  }
};

module.exports = Cart;

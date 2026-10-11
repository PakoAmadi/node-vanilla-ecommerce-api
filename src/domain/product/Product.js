'use strict';

const {InvalidProductError, InvalidProductIdError} = require('../errors');
const {toCents} = require('../money');

const TITLE_MAX = 255;

/**
 * Product invariants. The same rules apply to creation and to full update (PUT).
 */
const Product = {
  /**
   * @param {unknown} value raw id (body or URL param)
   * @returns {number} positive integer id
   */
  parseId(value) {
    const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(id) || id <= 0) throw new InvalidProductIdError();
    return id;
  },

  /**
   * @param {{title:unknown, description?:unknown, price:unknown, stock:unknown}} input
   * @returns {{title:string, description:string|null, price:number, stock:number}}
   * @throws {InvalidProductError} with per-field details
   */
  validate({title, description, price, stock}) {
    const errors = {};

    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (title.trim().length > TITLE_MAX) {
      errors.title = `Title must be at most ${TITLE_MAX} characters`;
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.description = 'Description must be a string';
    }

    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      errors.price = 'Price must be a non-negative number';
    } else if (toCents(price) / 100 !== price) {
      errors.price = 'Price must have at most 2 decimal places';
    }

    if (!Number.isSafeInteger(stock) || stock < 0) {
      errors.stock = 'Stock must be a non-negative integer';
    }

    if (Object.keys(errors).length > 0) throw new InvalidProductError(errors);

    return {title: title.trim(), description: description ?? null, price, stock};
  }
};

module.exports = Product;

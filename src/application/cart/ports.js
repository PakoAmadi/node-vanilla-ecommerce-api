'use strict';

/**
 * Ports required by the cart use cases (in addition to orders/ports.js).
 *
 * @typedef {object} CartItemView
 * @property {number} itemId
 * @property {number} productId
 * @property {string} title
 * @property {number|string} price
 * @property {number} quantity
 *
 * @typedef {object} CartRepository
 * @property {(userId:number) => Promise<CartItemView[]>} findItemsByUser
 * @property {(userId:number) => Promise<number>} getOrCreateCartId
 *           Atomic; inside a transaction it also locks the cart row, which
 *           serialises concurrent modifications of the same cart.
 * @property {(cartId:number, productId:number) => Promise<number>} getItemQuantity  0 if absent
 * @property {(cartId:number, productId:number, quantity:number) => Promise<void>} addQuantity
 * @property {(userId:number, productId:number) => Promise<boolean>} removeItem  false if nothing was removed
 *
 * @typedef {object} ProductRepository
 * @property {(productId:number) => Promise<number|null>} findStockById  null if product does not exist
 *
 * UnitOfWork: see orders/ports.js — run(work) gives {carts, products, orders}.
 */

module.exports = {};

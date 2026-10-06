'use strict';

/**
 * Ports (interfaces) required by the orders use cases.
 * The application layer depends only on these contracts;
 * concrete implementations live in src/infrastructure.
 *
 * @typedef {object} CheckoutCartItem
 * @property {number} productId
 * @property {string} title
 * @property {number|string} price
 * @property {number} quantity
 * @property {number} stock
 *
 * @typedef {object} CartRepository
 * @property {(userId:number) => Promise<CheckoutCartItem[]>} getItemsForCheckout
 *           Returns cart items and locks the related product rows until the transaction ends.
 * @property {(userId:number) => Promise<void>} clear
 *
 * @typedef {object} ProductRepository
 * @property {(items:Array<{productId:number,quantity:number}>) => Promise<void>} decreaseStock
 *           Must throw InsufficientStockError if stock would drop below zero.
 *
 * @typedef {object} OrderRepository
 * @property {(order:import('../../domain/order/Order')) => Promise<{id:number,createdAt:Date}>} save
 * @property {(userId:number) => Promise<object[]>} findHistoryByUser
 *
 * @typedef {object} TransactionalRepositories
 * @property {CartRepository} carts
 * @property {ProductRepository} products
 * @property {OrderRepository} orders
 *
 * @typedef {object} UnitOfWork
 * @property {<T>(work:(repos:TransactionalRepositories) => Promise<T>) => Promise<T>} run
 *           Executes `work` atomically: commits on success, rolls back on any error.
 */

module.exports = {};

'use strict';

/**
 * @typedef {object} ProductRecord
 * @property {number} id
 * @property {string} title
 * @property {string|null} description
 * @property {number|string} price
 * @property {number} stock
 * @property {string|null} imageUrl
 * @property {Date} [createdAt]
 *
 * @typedef {{title:string, description:string|null, price:number, stock:number}} ProductData
 *
 * @typedef {object} ProductCatalogRepository
 * @property {() => Promise<ProductRecord[]>} findAll        newest first
 * @property {(id:number) => Promise<ProductRecord|null>} findById
 * @property {(data:ProductData) => Promise<ProductRecord>} create
 *           throws ProductTitleTakenError on duplicate title
 * @property {(id:number, data:ProductData) => Promise<ProductRecord|null>} update
 *           null if not found; throws ProductTitleTakenError on duplicate title
 * @property {(id:number) => Promise<boolean>} delete      false if not found
 */

module.exports = {};

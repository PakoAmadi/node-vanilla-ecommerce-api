'use strict';

const {EmptyCartError, InsufficientStockError} = require('../errors');
const {toCents, fromCents} = require('../money');

const DEFAULT_STATUS = 'paid';

class Order {
  /**
   * @param {object} props
   * @param {number} props.userId
   * @param {Array<{productId:number,title:string,price:number,quantity:number}>} props.items
   * @param {number} props.totalPrice
   * @param {string} props.status
   * @param {number|null} [props.id]
   * @param {Date|null} [props.createdAt]
   */
  constructor({userId, items, totalPrice, status, id = null, createdAt = null}) {
    this.id = id;
    this.userId = userId;
    this.items = items;
    this.totalPrice = totalPrice;
    this.status = status;
    this.createdAt = createdAt;
  }

  /**
   * Business rule: an order can be placed only from a non-empty cart
   * and only if every product has enough stock.
   * Price and title are snapshotted at the moment of purchase.
   *
   * @param {number} userId
   * @param {Array<{productId:number,title:string,price:number|string,quantity:number,stock:number}>} cartItems
   * @returns {Order}
   */
  static placeFrom(userId, cartItems) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new EmptyCartError();
    }

    let totalCents = 0;
    const items = cartItems.map((item) => {
      if (item.stock < item.quantity) {
        throw InsufficientStockError.forProduct(item.title, item.stock);
      }
      totalCents += toCents(item.price) * item.quantity;
      return {
        productId: item.productId,
        title: item.title,
        price: Number(item.price),
        quantity: item.quantity
      };
    });

    return new Order({userId, items, totalPrice: fromCents(totalCents), status: DEFAULT_STATUS});
  }

  // Returns a copy enriched with data assigned by persistence (id, createdAt)
  withPersistence({id, createdAt}) {
    return new Order({...this, id, createdAt});
  }
}

module.exports = Order;

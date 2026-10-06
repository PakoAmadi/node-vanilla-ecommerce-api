'use strict';

/**
 * @implements {import('../../../application/orders/ports').CartRepository}
 */
class PgCartRepository {
  /** @param {{query: Function}} executor pg client (inside a transaction) or pool */
  constructor(executor) {
    this.executor = executor;
  }

  async getItemsForCheckout(userId) {
    // FOR UPDATE OF p: lock product rows so concurrent checkouts wait for this transaction
    const {rows} = await this.executor.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock
       FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       JOIN products p ON ci.product_id = p.id
       WHERE c.user_id = $1
       FOR UPDATE OF p`,
      [userId]
    );

    return rows.map((row) => ({
      productId: row.product_id,
      title: row.title,
      price: row.price,
      quantity: row.quantity,
      stock: row.stock
    }));
  }

  async clear(userId) {
    await this.executor.query(
      'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)',
      [userId]
    );
  }
}

module.exports = PgCartRepository;

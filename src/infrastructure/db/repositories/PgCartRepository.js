'use strict';

/**
 * Implements CartRepository from application/orders/ports.js and application/cart/ports.js
 */
class PgCartRepository {
  /** @param {{query: Function}} executor pg client (inside a transaction) or pool */
  constructor(executor) {
    this.executor = executor;
  }

  // ---------- used by checkout ----------

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

  // ---------- used by cart use cases ----------

  async findItemsByUser(userId) {
    const {rows} = await this.executor.query(
      `SELECT ci.id AS item_id, p.id AS product_id, p.title, p.price, ci.quantity
       FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       JOIN products p ON ci.product_id = p.id
       WHERE c.user_id = $1
       ORDER BY ci.id`,
      [userId]
    );

    return rows.map((row) => ({
      itemId: row.item_id,
      productId: row.product_id,
      title: row.title,
      price: row.price,
      quantity: row.quantity
    }));
  }

  async getOrCreateCartId(userId) {
    // Atomic upsert: no SELECT-then-INSERT race. DO UPDATE (not DO NOTHING) so that
    // RETURNING always yields the id and the cart row stays locked until the transaction ends.
    const {rows} = await this.executor.query(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [userId]
    );
    return rows[0].id;
  }

  async getItemQuantity(cartId, productId) {
    const {rows} = await this.executor.query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );
    return rows.length ? rows[0].quantity : 0;
  }

  async addQuantity(cartId, productId, quantity) {
    await this.executor.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, productId, quantity]
    );
  }

  async removeItem(userId, productId) {
    const {rowCount} = await this.executor.query(
      `DELETE FROM cart_items
       WHERE product_id = $2
         AND cart_id = (SELECT id FROM carts WHERE user_id = $1)`,
      [userId, productId]
    );
    return rowCount > 0;
  }
}

module.exports = PgCartRepository;

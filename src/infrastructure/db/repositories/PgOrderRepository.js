'use strict';

/**
 * @implements {import('../../../application/orders/ports').OrderRepository}
 */
class PgOrderRepository {
  /** @param {{query: Function}} executor */
  constructor(executor) {
    this.executor = executor;
  }

  /** @param {import('../../../domain/order/Order')} order */
  async save(order) {
    const {rows} = await this.executor.query(
      'INSERT INTO orders (user_id, total_price, status) VALUES ($1, $2, $3) RETURNING id, created_at',
      [order.userId, order.totalPrice, order.status]
    );
    const {id, created_at: createdAt} = rows[0];

    for (const item of order.items) {
      await this.executor.query(
        'INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES ($1, $2, $3, $4, $5)',
        [id, item.productId, item.title, item.price, item.quantity]
      );
    }

    return {id, createdAt};
  }

  async findHistoryByUser(userId) {
    // Items are aggregated into a JSON array by Postgres (json_agg)
    const {rows} = await this.executor.query(
      `SELECT
         o.id,
         o.total_price,
         o.status,
         o.created_at,
         coalesce(json_agg(
           json_build_object('title', oi.title, 'price', oi.price, 'quantity', oi.quantity)
         ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = PgOrderRepository;

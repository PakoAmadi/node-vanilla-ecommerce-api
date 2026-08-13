'use strict';

const db = require('../database/db');
const { BadRequestError } = require('../errors/errors');

const orderHandler = {

  async checkout(req, res, params, ctx) {
    const userId = ctx.user.id;

    // 1. Start the transaction IMMEDIATELY
    await db.query('BEGIN');

    try {
      // 2. Retrieve items from the shopping cart AND lock the product rows against other transactions!
      // Note the “FOR UPDATE” at the end. It will force other concurrent
      // queries to wait until this transaction commits or rolls back.
      const cartItemsQuery = `
        SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock
        FROM carts c
        JOIN cart_items ci ON c.id = ci.cart_id
        JOIN products p ON ci.product_id = p.id
        WHERE c.user_id = $1
        FOR UPDATE OF p; -- We lock rows only in the products table
      `;
      const cartResult = await db.query(cartItemsQuery, [userId]);

      if (cartResult.rows.length === 0) {
        // If the cart is empty, roll back the empty transaction
        await db.query('ROLLBACK');
        throw new BadRequestError('Cannot checkout an empty cart');
      }

      const items = cartResult.rows;
      let totalPrice = 0;

      // 3. Validate the balances (the data is now 100% up-to-date and locked for others)
      for (const item of items) {
        if (item.stock < item.quantity) {
          throw new BadRequestError(`Not enough stock for product: ${item.title}. Available: ${item.stock}`);
        }
        totalPrice += Number(item.price) * item.quantity;
      }

      // 4. Create an order
      const orderInsert = await db.query(
        'INSERT INTO orders (user_id, total_price, status) VALUES ($1, $2, $3) RETURNING id, total_price, status, created_at',
        [userId, totalPrice, 'paid']
      );
      const newOrder = orderInsert.rows[0];

      // 5. Record the positions and decrease the stock
      for (const item of items) {
        await db.query(
          'INSERT INTO order_items (order_id, product_id, title, price, quantity) VALUES ($1, $2, $3, $4, $5)',
          [newOrder.id, item.product_id, item.title, item.price, item.quantity]
        );

        // This query is guaranteed not to let the stock drop below 0, thanks to the CHECK constraint in the database
        await db.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // 6. Clear the trash
      await db.query('DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)', [userId]);

      // Commit all changes atomically
      await db.query('COMMIT');

      res.writeHead(201);
      res.end(JSON.stringify({
        message: 'Order placed successfully!',
        order: {
          id: newOrder.id,
          totalPrice: Number(newOrder.total_price),
          status: newOrder.status,
          createdAt: newOrder.created_at,
          items: items.map(i => ({ title: i.title, price: Number(i.price), quantity: i.quantity }))
        }
      }));

    } catch (error) {
      // Any failure (including a Postgres CHECK constraint error) will roll everything back
      await db.query('ROLLBACK');

      // If this is a Postgres constraint error (code 23514 — check_violation)
      if (error.code === '23514') {
        throw new BadRequestError('Transaction aborted: One of the products went out of stock.');
      }

      throw error;
    }
  },

  async getHistory(req, res, params, ctx) {
    const userId = ctx.user.id;
    // The query retrieves orders and groups their items into an array of JSON objects (native Postgres aggregator)
    const query = `
      SELECT 
        o.id, 
        o.total_price, 
        o.status, 
        o.created_at,
        coalesce(json_agg(
          json_build_object(
            'title', oi.title,
            'price', oi.price,
            'quantity', oi.quantity
          )
        ), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    const result = await db.query(query, [userId]);

    res.writeHead(200);
    res.end(JSON.stringify({ orders: result.rows }));
  }
};

module.exports = orderHandler;

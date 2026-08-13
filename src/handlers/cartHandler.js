'use strict';

const db = require('../database/db');
const { NotFoundError, BadRequestError } = require('../errors/errors');

const cartHandler = {
  async getCart(req, res, params, ctx) {
    const userId = ctx.user.id;

    const query = `
      SELECT 
        ci.id as item_id,
        p.id as product_id,
        p.title,
        p.price,
        ci.quantity,
        (p.price * ci.quantity) as total_item_price
      FROM carts c
      JOIN cart_items ci ON c.id = ci.cart_id
      JOIN products p ON ci.product_id = p.id
      WHERE c.user_id = $1;
    `;

    const result = await db.query(query, [userId]);
    const totalPrice = result.rows.reduce((sum, item) => sum + Number(item.total_item_price), 0);

    res.writeHead(200);
    res.end(JSON.stringify({
      cart: result.rows,
      total_cart_price: Number(totalPrice.toFixed(2))
    }));
  },

  async addItem(req, res, params, ctx) {
    const userId = ctx.user.id;
    const { productId, quantity = 1 } = ctx.body;

    if (!productId) throw new BadRequestError('Product ID is required');

    // 1. We check whether this product even exists and whether it's in stock
    const productCheck = await db.query('SELECT stock FROM products WHERE id = $1', [productId]);
    if (productCheck.rows.length === 0) throw new NotFoundError('Product not found');
    if (productCheck.rows[0].stock < quantity) throw new BadRequestError('Not enough stock available');

    // 2. Initialize the user's shopping cart if it doesn't already exist (Upsert/First-Load pattern)
    let cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let cartId;

    if (cartResult.rows.length === 0) {
      const newCart = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // 3.  Add an item to the cart or update the quantity if it's already in the cart (UPSERT in plain SQL)
    const upsertQuery = `
      INSERT INTO cart_items (cart_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
      RETURNING *;
    `;

    await db.query(upsertQuery, [cartId, productId, quantity]);

    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Item added to cart successfully!' }));
  },

  async removeItem(req, res, params, ctx) {
    const userId = ctx.user.id;
    const productId = params.productId;

    //  Find the user's cart ID
    const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (cartResult.rows.length === 0) throw new NotFoundError('Cart is empty');

    const cartId = cartResult.rows[0].id;

    // Delete an item
    const deleteResult = await db.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );

    if (deleteResult.rowCount === 0) {
      throw new NotFoundError('Product not found in your cart');
    }

    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Item removed from cart' }));
  }
};

module.exports = cartHandler;

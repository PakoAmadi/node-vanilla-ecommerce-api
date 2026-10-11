'use strict';

const db = require('../infrastructure/db/db');
const { NotFoundError, HttpError, ConflictError} = require('../interfaces/http/errors');


const productHandler = {
  async deleteOne(req, res, params, ctx) {
      const productId = params.id;
      const result = await db.query(`DELETE FROM products WHERE id = $1`, [productId]);
      if (result.rowCount === 0) throw new NotFoundError(`Product with ID ${productId} not found`);
      res.writeHead(200);
      res.end(JSON.stringify({message: 'Product deleted successfully!'}))
  },
  async updateOne(req, res, params, ctx) {
    try {
      const productId = params.id;
      const {title, description, price, stock} = ctx.body
      const result = await db.query(
        'UPDATE products SET title = $1, description = $2, price = $3, stock = $4 WHERE id = $5 RETURNING *',
        [title, description, price, stock, productId]
      );

      if (result.rowCount === 0) throw new NotFoundError(`Product with ID ${productId} not found`);
      const updatedProduct = result.rows[0];
      res.writeHead(200);
      res.end(JSON.stringify({
        message: 'Product updated successfully',
        product: {...updatedProduct}
      }));
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictError('Product with this name already exists');
      }
      throw new HttpError('Something went wrong!')
    }
  },
  async getAll(req, res, params, ctx) {
    try {
      const result = await db.query('SELECT id, title, description, price, stock, image_url FROM products ORDER BY id DESC');
      res.writeHead(200);
      res.end(JSON.stringify({
        products: result.rows
      }));
    } catch(error) {
      throw new HttpError('Something went wrong!')
    }
  },

  async getOne(req, res, params, ctx) {
    const productId = params.id;
    const result = await db.query(
      'SELECT id, title, description, price, stock, image_url FROM products WHERE id = $1',
      [productId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }
    res.writeHead(200);
    res.end(JSON.stringify(result.rows[0]));
  },

  async createOne(req, res, params, ctx) {
    try {
      const {title, description, price, stock} = ctx.body;
      const result = await db.query(`INSERT INTO products (title, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *`,
        [title, description, price, stock]) ;
      const newProduct = result.rows[0];
      res.writeHead(201);
      res.end(JSON.stringify({
        message: 'Product added successfully',
        product: {...newProduct}
      }));
    } catch(error) {
      if (error.code === '23505') {
        throw new ConflictError('Product with this name already exists');
      }
      throw new HttpError('Something went wrong!')
    }
  }
}

module.exports = productHandler
'use strict';

const {InsufficientStockError, ProductTitleTakenError} = require('../../../domain/errors');

const PG_CHECK_VIOLATION = '23514';
const PG_UNIQUE_VIOLATION = '23505';

const COLUMNS = 'id, title, description, price, stock, image_url, created_at';

const toRecord = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  price: row.price,
  stock: row.stock,
  imageUrl: row.image_url,
  createdAt: row.created_at
});

const translateUniqueViolation = (error) => {
  if (error.code === PG_UNIQUE_VIOLATION) return new ProductTitleTakenError();
  return error;
};

/**
 * Implements ProductRepository (orders, cart) and ProductCatalogRepository (products).
 */
class PgProductRepository {
  /** @param {{query: Function}} executor pg client (inside a transaction) or pool */
  constructor(executor) {
    this.executor = executor;
  }

  // ---------- catalog ----------

  async findAll() {
    const {rows} = await this.executor.query(`SELECT ${COLUMNS} FROM products ORDER BY id DESC`);
    return rows.map(toRecord);
  }

  async findById(id) {
    const {rows} = await this.executor.query(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
    return rows.length ? toRecord(rows[0]) : null;
  }

  async create({title, description, price, stock}) {
    try {
      const {rows} = await this.executor.query(
        `INSERT INTO products (title, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
        [title, description, price, stock]
      );
      return toRecord(rows[0]);
    } catch (error) {
      throw translateUniqueViolation(error);
    }
  }

  async update(id, {title, description, price, stock}) {
    try {
      const {rows} = await this.executor.query(
        `UPDATE products SET title = $1, description = $2, price = $3, stock = $4
         WHERE id = $5 RETURNING ${COLUMNS}`,
        [title, description, price, stock, id]
      );
      return rows.length ? toRecord(rows[0]) : null;
    } catch (error) {
      throw translateUniqueViolation(error);
    }
  }

  async delete(id) {
    const {rowCount} = await this.executor.query('DELETE FROM products WHERE id = $1', [id]);
    return rowCount > 0;
  }

  // ---------- cart / checkout ----------

  async findStockById(productId) {
    const {rows} = await this.executor.query('SELECT stock FROM products WHERE id = $1', [productId]);
    return rows.length ? rows[0].stock : null;
  }

  async decreaseStock(items) {
    try {
      for (const item of items) {
        await this.executor.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    } catch (error) {
      // Last line of defence: CHECK (stock >= 0) on the table
      if (error.code === PG_CHECK_VIOLATION) throw new InsufficientStockError();
      throw error;
    }
  }
}

module.exports = PgProductRepository;

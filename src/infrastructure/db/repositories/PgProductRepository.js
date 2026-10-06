'use strict';

const {InsufficientStockError} = require('../../../domain/errors');

const PG_CHECK_VIOLATION = '23514';

/**
 * @implements {import('../../../application/orders/ports').ProductRepository}
 */
class PgProductRepository {
  /** @param {{query: Function}} executor */
  constructor(executor) {
    this.executor = executor;
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

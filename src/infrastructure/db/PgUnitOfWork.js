'use strict';

const PgCartRepository = require('./repositories/PgCartRepository');
const PgProductRepository = require('./repositories/PgProductRepository');
const PgOrderRepository = require('./repositories/PgOrderRepository');

/**
 * Runs a unit of work inside ONE dedicated connection, so BEGIN / FOR UPDATE /
 * COMMIT / ROLLBACK all happen on the same session.
 *
 * Implements UnitOfWork from application/orders/ports.js (shared by orders and cart).
 */
class PgUnitOfWork {
  /** @param {{getClient: () => Promise<import('pg').PoolClient>}} db */
  constructor(db) {
    this.db = db;
  }

  async run(work) {
    const client = await this.db.getClient();
    let brokenConnection;
    try {
      await client.query('BEGIN');
      const result = await work({
        carts: new PgCartRepository(client),
        products: new PgProductRepository(client),
        orders: new PgOrderRepository(client)
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        brokenConnection = rollbackError; // don't return a broken connection to the pool
      }
      throw error;
    } finally {
      client.release(brokenConnection);
    }
  }
}

module.exports = PgUnitOfWork;

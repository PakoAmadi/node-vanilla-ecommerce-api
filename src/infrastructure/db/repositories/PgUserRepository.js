'use strict';

const {EmailAlreadyTakenError} = require('../../../domain/errors');

const PG_UNIQUE_VIOLATION = '23505';

const toRecord = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at
});

/**
 * Implements UserRepository (application/auth/ports.js).
 */
class PgUserRepository {
  /** @param {{query: Function}} executor */
  constructor(executor) {
    this.executor = executor;
  }

  async create({name, email, passwordHash}) {
    try {
      const {rows} = await this.executor.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
        [name, email, passwordHash]
      );
      return toRecord(rows[0]);
    } catch (error) {
      if (error.code === PG_UNIQUE_VIOLATION) throw new EmailAlreadyTakenError();
      throw error;
    }
  }

  async findByEmail(email) {
    const {rows} = await this.executor.query(
      'SELECT id, name, email, role, created_at, password FROM users WHERE email = $1',
      [email]
    );
    if (!rows.length) return null;
    return {...toRecord(rows[0]), passwordHash: rows[0].password};
  }

  async findById(id) {
    const {rows} = await this.executor.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows.length ? toRecord(rows[0]) : null;
  }
}

module.exports = PgUserRepository;

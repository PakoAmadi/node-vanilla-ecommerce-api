'use strict';

const {hash, verifyPassword} = require('../infrastructure/security/hash');
const {ConflictError, UnauthorizedError} = require("../interfaces/http/errors");
const db = require('../infrastructure/db/db')
const {generateToken} = require('../infrastructure/security/jwt')

const authHandler = {
  async login(req, res, params, ctx) {
    const {email, password} = ctx.body
    const selectQuery = `SELECT * FROM users WHERE email = $1`;
    const result = await db.query(selectQuery, [email]);

    if (result.rows.length === 0) throw new UnauthorizedError('Wrong email or password!');
    const storedHash = result.rows[0].password;
    const matched = await verifyPassword(password, storedHash)
    if (!matched) throw new UnauthorizedError('Wrong email or password!')

    const loadedUser = result.rows[0]
    const payload = {id: loadedUser.id, role: loadedUser.role}
    const token = generateToken(payload, process.env.JWT_TOKEN_SECRET);

    res.writeHead(201)
    res.end(JSON.stringify({
      token,
      user: {
        id: loadedUser.id,
        name: loadedUser.name,
        email: loadedUser.email,
        role: loadedUser.role,
        createdAt: loadedUser.created_at
      }
    }))
  },

  async register(req, res, params, ctx) {
    const {name, email, password} = ctx.body
    const hashedPassword = await hash(password);

    try {
      const insertQuery = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at;`;
      const result = await db.query(insertQuery, [name, email, hashedPassword]);

      const newUser = result.rows[0];
      res.writeHead(201);
      res.end(JSON.stringify({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.created_at
        }
      }));

    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictError('User with this email already exists');
      }

      throw error;
    }
  }
}

module.exports = authHandler
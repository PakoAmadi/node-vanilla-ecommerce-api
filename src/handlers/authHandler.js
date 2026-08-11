'use strict';

const {hash} = require('../utils/hash')
const {ConflictError} = require("../errors/errors");
const db = require('../database/db')

const authHandler = {
    async login(req, res, params, ctx) {

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

        } catch(error) {
            if (error.code === '23505') {
                throw new ConflictError('User with this email already exists');
            }

            throw error;
        }
    }
}

module.exports = authHandler
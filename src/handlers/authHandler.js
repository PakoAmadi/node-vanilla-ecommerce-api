'use strict';

const receiveArgs = require('../utils/body')
const sanitizeRegistrationData = require('../utils/sanitizers/sanitizeRegistrationData')
const {validateRegistration} = require("../utils/validators/validateRegistration");
const {hash} = require('../utils/hash')
const {ConflictError} = require("../errors/errors");

const authHandler = {

    async register(req, res) {
        const rawBody = await receiveArgs(req)
        const sanitizedData = sanitizeRegistrationData(rawBody);
        validateRegistration(sanitizedData);
        const hashedPassword = await hash(sanitizedData.password);

        try {
            const insertQuery = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at;`;
            const result = await db.query(insertQuery, [
                sanitizedData.name,
                sanitizedData.email,
                hashedPassword
            ]);

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
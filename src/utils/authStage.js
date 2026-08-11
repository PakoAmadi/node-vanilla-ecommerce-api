'use strict';

const {verifyToken} = require('./jwt');
const { UnauthorizedError } = require('../errors/errors');

module.exports = async (req, res, params, ctx) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
        throw new UnauthorizedError('Authorization header missing')
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedError('Invalid authorization format');
    }

    const decodedUser = verifyToken(token, process.env.JWT_SECRET || 'super_secret_key');
    if (!decodedUser) {
        throw new UnauthorizedError('Invalid or expired token');
    }
    return { ...ctx, user: decodedUser };
}
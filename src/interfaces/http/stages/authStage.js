'use strict';

const {UnauthorizedError} = require('../errors');

/**
 * Pipe stage: verifies "Authorization: Bearer <token>" and puts {id, role} into ctx.user.
 * @param {{tokens: import('../../../application/auth/ports').TokenService}} deps
 */
const makeAuthStage = ({tokens}) => async (req, res, params, ctx) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    throw new UnauthorizedError('Authorization header missing');
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    throw new UnauthorizedError('Invalid authorization format');
  }

  const user = tokens.verify(token);
  if (!user) {
    throw new UnauthorizedError('Invalid or expired token');
  }
  return {...ctx, user};
};

module.exports = makeAuthStage;

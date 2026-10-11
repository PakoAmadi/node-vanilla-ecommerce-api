'use strict';

const { ForbiddenError, UnauthorizedError } = require('../errors');

module.exports = async (req, res, params, ctx) => {
  if (!ctx || !ctx.user) {
    throw new UnauthorizedError('Authentication required before role verification');
  }

  if (ctx.user.role !== 'admin') {
    throw new ForbiddenError('Access denied: Admin privileges required');
  }

  return ctx;
};

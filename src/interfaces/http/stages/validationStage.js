'use strict';
const receiveArgs = require('../readJsonBody');

module.exports = ({sanitize, validate}) => {
  return async (req, res, params, ctx) => {
    let bodyData = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      bodyData = await receiveArgs(req);
    }

    const sanitized = sanitize ? sanitize(bodyData) : bodyData;
    if (validate) validate(sanitized);
    return {...ctx, body: sanitized};
  }
}
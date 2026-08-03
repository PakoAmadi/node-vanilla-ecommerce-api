'use strict';

const receiveArgs = require('./body')

const defaultSanitize = (rawBody) => rawBody;
const defaultValidate = () => {}

const withValidation = (option={}, handler) => {
    const sanitize = option.sanitize || defaultSanitize;
    const validate = option.validate || defaultValidate;
    return async (req, res, params) => {
        let bodyData = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            bodyData = receiveArgs(req);
        }
        const sanitizeData = sanitize(bodyData);
        validate(sanitizeData);

        return handler(req, res, params, sanitizeData)
    }
}

module.exports = withValidation
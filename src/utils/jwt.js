'use strict';

const crypto = require('node:crypto');

const base64url = (str) => {
    return Buffer.from(str)
        .toString()
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
}

const generateToken = (payload, secret, expiresInSeconds = 3600) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload = { ...payload, exp };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(fullPayload))
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();
    const encodedSignature = base64url(signature);
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

module.exports = { generateToken }

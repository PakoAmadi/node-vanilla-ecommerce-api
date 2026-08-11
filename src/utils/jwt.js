'use strict';

const crypto = require('node:crypto');

const generateToken = (payload, secret, expiresInSeconds = 3600) => {

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');

    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload = { ...payload, exp };
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const encodedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

const verifyToken = (token, secret) => {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    try {
        const localSignature = crypto
            .createHmac('sha256', secret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64url');

        const localBuffer = Buffer.from(localSignature, 'utf8');
        const tokenBuffer = Buffer.from(encodedSignature, 'utf8');

        if (localBuffer.length !== tokenBuffer.length) return null;

        const isSignatureValid = crypto.timingSafeEqual(localBuffer, tokenBuffer);
        if (!isSignatureValid) return null;

        const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
        const payload = JSON.parse(payloadStr);

        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowInSeconds) {
            return null;
        }

        return payload;
    } catch (e) {
        return null;
    }
};

module.exports = { generateToken, verifyToken };
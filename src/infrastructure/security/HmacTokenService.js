'use strict';

const {generateToken, verifyToken} = require('./jwt');

/**
 * Implements TokenService (application/auth/ports.js) with HS256 JWT.
 * The secret is injected from config — no process.env access here.
 */
class HmacTokenService {
  /** @param {{secret:string, expiresInSeconds?:number}} options */
  constructor({secret, expiresInSeconds = 3600}) {
    if (!secret) throw new Error('HmacTokenService: secret is required');
    this.secret = secret;
    this.expiresInSeconds = expiresInSeconds;
  }

  issue({id, role}) {
    return generateToken({id, role}, this.secret, this.expiresInSeconds);
  }

  verify(token) {
    const payload = verifyToken(token, this.secret);
    if (!payload) return null;
    return {id: payload.id, role: payload.role};
  }
}

module.exports = HmacTokenService;

'use strict';

const crypto = require('node:crypto');
const {hash, verifyPassword} = require('./hash');

// A valid "salt:key" pair used when the user does not exist, so that verify()
// performs a real scrypt computation and takes the same time.
const DUMMY_HASH = `${crypto.randomBytes(16).toString('base64')}:${crypto.randomBytes(64).toString('base64')}`;

/**
 * Implements PasswordHasher (application/auth/ports.js) on top of node:crypto scrypt.
 */
class ScryptPasswordHasher {
  hash(plain) {
    return hash(plain);
  }

  async verify(plain, storedHash) {
    if (storedHash === null) {
      await verifyPassword(plain, DUMMY_HASH);
      return false;
    }
    return verifyPassword(plain, storedHash);
  }
}

module.exports = ScryptPasswordHasher;

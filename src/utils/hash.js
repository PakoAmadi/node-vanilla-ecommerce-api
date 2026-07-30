'use strict';

const crypto = require('node:crypto');

const hash = (password) => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString('base64');
  crypto.scrypt(password, salt, 64, (err, result) => {
    if (err) return reject(err);
    resolve(salt + ':' + result.toString('base64'));
  });
});

const verifyPassword = (password, storedHash) => new Promise((resolve, reject) => {

  if (!storedHash || typeof storedHash !== 'string') return resolve(false);
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return resolve(false);

  crypto.scrypt(password, salt, 64, (err, result) => {
    if (err) return reject(err);
    const hashBuffer = Buffer.from(key, 'base64');
    if (hashBuffer.length !== result.length) return resolve(false);
    const isMatch = crypto.timingSafeEqual(hashBuffer, result);
    resolve(isMatch);
  });
});


module.exports = { hash, verifyPassword };

'use strict'

const test = require('node:test');
const assert = require('node:assert');
const {hash, verifyPassword} = require('../src/infrastructure/security/hash');

test('Password Verification Module', async (t) => {
  await t.test('should return true for matching password and hash', async () => {
    const password = 'correct_password_123';
    const generatedHash = await hash(password);

    const isMatch = await verifyPassword(password, generatedHash);
    assert.strictEqual(isMatch, true);
  });

  await t.test('should return false for incorrect password', async () => {
    const password = 'correct_password_123';
    const wrongPassword = 'wrong_password_123';
    const generatedHash = await hash(password);

    const isMatch = await verifyPassword(wrongPassword, generatedHash);
    assert.strictEqual(isMatch, false);
  });

  await t.test('should handle malformed hash strings gracefully without crashing', async () => {
    const password = 'anyPassword';
    const badHash = 'invalid-hash-without-colon';

    const isMatch = await verifyPassword(password, badHash);
    assert.strictEqual(isMatch, false);
  });
})
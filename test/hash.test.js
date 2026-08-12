'use strict'

const test = require('node:test');
const assert = require('node:assert');
const {hash} = require('../src/utils/hash');


test('Password Hashing Module', async (t) => {
  await t.test('should successfully hash a password and return string in salt:hash format', async () => {
    const password = 'mySecurePassword123';
    const result = await hash(password);
    assert.strictEqual(typeof result, 'string');

    //if the string is separated by a colon into “salt” and “hash”
    const parts = result.split(':');
    assert.strictEqual(parts.length, 2);

    //check that both parts are valid Base64 strings
    assert.match(parts[0], /^[A-Za-z0-9+/=]+$/);
    assert.match(parts[1], /^[A-Za-z0-9+/=]+$/);
  })

  await t.test('should generate unique hashes for the same password due to random salt', async () => {
    const password = 'samePassword';

    const hash1 = await hash(password);
    const hash2 = await hash(password);

    // The hashes must be different, since the salt is always random
    assert.notStrictEqual(hash1, hash2);
  });

  await t.test('should reject if invalid arguments are passed', async () => {
    // We're passing a number instead of a string or buffer, which should cause an error in scrypt
    await assert.rejects(
      async () => {
        await hash(12345);
      },
      (err) => {
        // ПLet's verify that this is a Node.js system error (TypeError)
        return err instanceof TypeError;
      }
    );
  });
})
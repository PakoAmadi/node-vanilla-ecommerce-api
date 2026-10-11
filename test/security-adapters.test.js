'use strict';

const test = require('node:test');
const assert = require('node:assert');
const HmacTokenService = require('../src/infrastructure/security/HmacTokenService');
const ScryptPasswordHasher = require('../src/infrastructure/security/ScryptPasswordHasher');

test('Security adapters (unit)', async (t) => {
  await t.test('HmacTokenService should issue and verify tokens with {id, role} only', () => {
    const tokens = new HmacTokenService({secret: 's1'});
    const token = tokens.issue({id: 5, role: 'admin', extra: 'ignored'});
    assert.deepStrictEqual(tokens.verify(token), {id: 5, role: 'admin'});
  });

  await t.test('HmacTokenService should reject tokens signed with another secret or expired', () => {
    const token = new HmacTokenService({secret: 's1'}).issue({id: 1, role: 'customer'});
    assert.strictEqual(new HmacTokenService({secret: 's2'}).verify(token), null);
    const expired = new HmacTokenService({secret: 's1', expiresInSeconds: -10}).issue({id: 1, role: 'customer'});
    assert.strictEqual(new HmacTokenService({secret: 's1'}).verify(expired), null);
    assert.strictEqual(new HmacTokenService({secret: 's1'}).verify('garbage'), null);
  });

  await t.test('HmacTokenService should require a secret', () => {
    assert.throws(() => new HmacTokenService({secret: ''}), /secret is required/);
  });

  await t.test('ScryptPasswordHasher should hash and verify', async () => {
    const passwords = new ScryptPasswordHasher();
    const stored = await passwords.hash('correct horse');
    assert.strictEqual(await passwords.verify('correct horse', stored), true);
    assert.strictEqual(await passwords.verify('wrong', stored), false);
  });

  await t.test('ScryptPasswordHasher.verify(null) should do real work and return false', async () => {
    const passwords = new ScryptPasswordHasher();
    const stored = await passwords.hash('x');
    const time = async (fn) => { const s = process.hrtime.bigint(); await fn(); return Number(process.hrtime.bigint() - s) / 1e6; };

    const unknownMs = await time(() => passwords.verify('x', null));
    const knownMs = await time(() => passwords.verify('y', stored));
    assert.strictEqual(await passwords.verify('x', null), false);
    // scrypt takes tens of ms; returning instantly (< 1/5 of a real check) would leak user existence
    assert.ok(unknownMs > knownMs / 5, `unknown=${unknownMs}ms known=${knownMs}ms`);
  });
});

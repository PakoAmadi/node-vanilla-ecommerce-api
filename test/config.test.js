'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {loadConfig} = require('../src/infrastructure/config/config');

test('Config loader (unit)', async (t) => {
  await t.test('should read JWT_SECRET (documented name)', () => {
    assert.strictEqual(loadConfig({JWT_SECRET: 'a'}).jwt.secret, 'a');
  });

  await t.test('should accept legacy JWT_TOKEN_SECRET, JWT_SECRET wins', () => {
    assert.strictEqual(loadConfig({JWT_TOKEN_SECRET: 'legacy'}).jwt.secret, 'legacy');
    assert.strictEqual(loadConfig({JWT_SECRET: 'new', JWT_TOKEN_SECRET: 'legacy'}).jwt.secret, 'new');
  });

  await t.test('should fall back to a dev secret outside production', () => {
    assert.strictEqual(typeof loadConfig({}).jwt.secret, 'string');
  });

  await t.test('should refuse to start in production without a secret', () => {
    assert.throws(() => loadConfig({NODE_ENV: 'production'}), /JWT_SECRET must be set/);
  });

  await t.test('should parse port and token lifetime, and be immutable', () => {
    const config = loadConfig({PORT: '8080', JWT_EXPIRES_IN_SECONDS: '60'});
    assert.strictEqual(config.port, 8080);
    assert.strictEqual(config.jwt.expiresInSeconds, 60);
    assert.ok(Object.isFrozen(config) && Object.isFrozen(config.jwt));
  });
});

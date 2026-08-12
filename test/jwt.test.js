'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const {generateToken} = require('../src/utils/jwt');

test('Native JWT Generator Module', async (t) => {
  const secret = 'super_secret_test_key_123';
  const payload = {id: 1, role: 'customer'};
  const decodeBase64url = (str) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString();
  };

  await t.test('should successfully generate a valid JWT string structure', () => {
    const token = generateToken(payload, secret);

    assert.strictEqual(typeof token, 'string');

    // JWT must consist strictly of three parts: Header, Payload, and Signature
    const parts = token.split('.');
    assert.strictEqual(parts.length, 3);
  });

  await t.test('should contain correct typ and alg in the decoded header', () => {
    const token = generateToken(payload, secret);
    const [encodedHeader] = token.split('.');

    const header = JSON.parse(decodeBase64url(encodedHeader));

    // Checking compliance with the RFC 7519 specification
    assert.strictEqual(header.alg, 'HS256');
    assert.strictEqual(header.typ, 'JWT');
  });

  await t.test('should embed application payload and expiration timestamp', () => {
    const token = generateToken(payload, secret, 3600); // 1-hour token
    const [, encodedPayload] = token.split('.');

    const decodedPayload = JSON.parse(decodeBase64url(encodedPayload));

    assert.strictEqual(decodedPayload.id, 1);
    assert.strictEqual(decodedPayload.role, 'customer');

    // Check that the timestamp `exp` has been generated and is in the future
    assert.ok(typeof decodedPayload.exp === 'number');
    const nowInSeconds = Math.floor(Date.now() / 1000);
    assert.ok(decodedPayload.exp > nowInSeconds);
  });

  await t.test('should generate a cryptographically valid HMAC-SHA256 signature', () => {
    const token = generateToken(payload, secret);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    const expectedSignatureBuffer = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();

    const expectedSignatureEncoded = expectedSignatureBuffer.toString('base64url');
    assert.strictEqual(encodedSignature, expectedSignatureEncoded);
  });
})
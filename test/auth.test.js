'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/infrastructure/config/loadEnv')();
const db = require('../src/infrastructure/db/db');
const createContainer = require('../src/container');
const RouterDispatcher = require('../src/interfaces/http/router/RouterDispatcher');
const {EmailAlreadyTakenError, InvalidCredentialsError} = require('../src/domain/errors');

/**
 * Integration suite for authentication and profile.
 * Real chain: router -> stages -> controller -> use case -> PgUserRepository / scrypt / JWT -> PostgreSQL.
 */
test('Auth Integration Suite (PostgreSQL)', async (t) => {
  const suffix = `${process.pid}_${Date.now()}`;
  const email = (label) => `auth_${label}_${suffix}@test.com`;
  let container;
  let dispatcher;

  const call = async (method, url, {body, token} = {}) => {
    const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
    const req = {
      method, url, headers: token ? {authorization: `Bearer ${token}`} : {},
      async *[Symbol.asyncIterator]() { yield* payload; }
    };
    const res = {
      statusCode: null, body: null, headersSent: false,
      writeHead(s) { this.statusCode = s; this.headersSent = true; },
      end(d) { this.body = JSON.parse(d); }
    };
    await dispatcher.dispatch(req, res);
    return res;
  };

  t.before(async () => {
    await db.connect();
    container = createContainer({db});
    dispatcher = new RouterDispatcher(container.router);
  });

  t.after(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', [`auth_%_${suffix}@test.com`]);
    await db.disconnect();
  });

  await t.test('register -> login -> /api/user full flow', async () => {
    const reg = await call('POST', '/api/auth/register',
      {body: {name: '  Ann  ', email: email('flow').toUpperCase(), password: 'password123'}});
    assert.strictEqual(reg.statusCode, 201);
    assert.strictEqual(reg.body.message, 'User registered successfully');
    assert.strictEqual(reg.body.user.email, email('flow'), 'email normalised to lower case');
    assert.strictEqual(reg.body.user.name, 'Ann');
    assert.strictEqual(reg.body.user.role, 'customer');
    assert.ok(!('password' in reg.body.user));

    const {rows} = await db.query('SELECT password FROM users WHERE email = $1', [email('flow')]);
    assert.notStrictEqual(rows[0].password, 'password123');
    assert.match(rows[0].password, /^[^:]+:[^:]+$/, 'stored as salt:hash');

    const login = await call('POST', '/api/auth/login', {body: {email: email('flow'), password: 'password123'}});
    assert.strictEqual(login.statusCode, 200);
    assert.strictEqual(login.body.user.id, reg.body.user.id);
    assert.strictEqual(typeof login.body.token, 'string');

    const me = await call('GET', '/api/user', {token: login.body.token});
    assert.strictEqual(me.statusCode, 200);
    assert.deepStrictEqual(me.body.user, reg.body.user);
  });

  await t.test('token issued by login works on other protected routes (one secret everywhere)', async () => {
    await call('POST', '/api/auth/register', {body: {name: 'Cart', email: email('cart'), password: 'password123'}});
    const {body: {token}} = await call('POST', '/api/auth/login', {body: {email: email('cart'), password: 'password123'}});
    const cart = await call('GET', '/api/cart', {token});
    assert.strictEqual(cart.statusCode, 200);
  });

  await t.test('duplicate email -> 409 (also through the use case)', async () => {
    const body = {name: 'Dup', email: email('dup'), password: 'password123'};
    assert.strictEqual((await call('POST', '/api/auth/register', {body})).statusCode, 201);
    const again = await call('POST', '/api/auth/register', {body});
    assert.strictEqual(again.statusCode, 409);
    assert.strictEqual(again.body.error, 'User with this email already exists');
    await assert.rejects(container.useCases.registerUser(body), EmailAlreadyTakenError);
  });

  await t.test('wrong password and unknown email -> same 401 response', async () => {
    await call('POST', '/api/auth/register', {body: {name: 'Bob', email: email('bob'), password: 'password123'}});
    const wrong = await call('POST', '/api/auth/login', {body: {email: email('bob'), password: 'password999'}});
    const unknown = await call('POST', '/api/auth/login', {body: {email: email('ghost'), password: 'password999'}});
    assert.strictEqual(wrong.statusCode, 401);
    assert.deepStrictEqual(wrong.body, unknown.body);
    await assert.rejects(container.useCases.loginUser({email: email('ghost'), password: 'x'}), InvalidCredentialsError);
  });

  await t.test('invalid registration payload -> 400 with validation errors', async () => {
    const res = await call('POST', '/api/auth/register', {body: {name: 'A', email: 'not-an-email', password: '1'}});
    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(Object.keys(JSON.parse(res.body.error).validationErrors).sort(), ['email', 'name', 'password']);
  });

  await t.test('/api/user: missing, malformed, tampered token -> 401', async () => {
    assert.strictEqual((await call('GET', '/api/user')).statusCode, 401);
    assert.strictEqual((await call('GET', '/api/user', {token: 'garbage'})).statusCode, 401);
    const token = container.services.tokens.issue({id: 1, role: 'customer'});
    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    assert.strictEqual((await call('GET', '/api/user', {token: tampered})).statusCode, 401);
  });

  await t.test('/api/user for a deleted user -> 404', async () => {
    const reg = await call('POST', '/api/auth/register', {body: {name: 'Gone', email: email('gone'), password: 'password123'}});
    const token = container.services.tokens.issue({id: reg.body.user.id, role: 'customer'});
    await db.query('DELETE FROM users WHERE id = $1', [reg.body.user.id]);
    const res = await call('GET', '/api/user', {token});
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.error, 'User not found');
  });
});

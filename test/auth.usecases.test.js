'use strict';

const test = require('node:test');
const assert = require('node:assert');
const makeAuthUseCases = require('../src/application/auth/authUseCases');
const {EmailAlreadyTakenError, InvalidCredentialsError, UserNotFoundError} = require('../src/domain/errors');

const createFakes = () => {
  const users = new Map();
  const verifyCalls = [];
  return {
    verifyCalls,
    users: {
      create: async ({name, email, passwordHash}) => {
        if ([...users.values()].some(u => u.email === email)) throw new EmailAlreadyTakenError();
        const u = {id: users.size + 1, name, email, role: 'customer', createdAt: new Date(), passwordHash};
        users.set(u.id, u);
        const {passwordHash: _, ...pub} = u;
        return pub;
      },
      findByEmail: async (email) => [...users.values()].find(u => u.email === email) ?? null,
      findById: async (id) => {
        const u = users.get(id);
        if (!u) return null;
        const {passwordHash, ...pub} = u;
        return pub;
      }
    },
    passwords: {
      hash: async (p) => `hashed:${p}`,
      verify: async (p, h) => { verifyCalls.push(h); return h === `hashed:${p}`; }
    },
    tokens: {issue: ({id, role}) => `token:${id}:${role}`, verify: () => null}
  };
};

test('Auth use cases (unit, fakes)', async (t) => {
  await t.test('registerUser should store only the hash, never the plain password', async () => {
    const f = createFakes();
    const uc = makeAuthUseCases(f);
    const user = await uc.registerUser({name: 'Ann', email: 'a@x.io', password: 'secret123'});
    assert.strictEqual(user.email, 'a@x.io');
    assert.ok(!('passwordHash' in user) && !('password' in user));
    assert.strictEqual((await f.users.findByEmail('a@x.io')).passwordHash, 'hashed:secret123');
  });

  await t.test('registerUser should propagate EmailAlreadyTakenError', async () => {
    const uc = makeAuthUseCases(createFakes());
    await uc.registerUser({name: 'Ann', email: 'a@x.io', password: 'secret123'});
    await assert.rejects(uc.registerUser({name: 'Bob', email: 'a@x.io', password: 'secret123'}), EmailAlreadyTakenError);
  });

  await t.test('loginUser should return token and user without credentials', async () => {
    const uc = makeAuthUseCases(createFakes());
    await uc.registerUser({name: 'Ann', email: 'a@x.io', password: 'secret123'});
    const {token, user} = await uc.loginUser({email: 'a@x.io', password: 'secret123'});
    assert.strictEqual(token, 'token:1:customer');
    assert.ok(!('passwordHash' in user));
  });

  await t.test('loginUser should fail identically for wrong password and unknown email', async () => {
    const f = createFakes();
    const uc = makeAuthUseCases(f);
    await uc.registerUser({name: 'Ann', email: 'a@x.io', password: 'secret123'});

    const wrong = await uc.loginUser({email: 'a@x.io', password: 'nope'}).catch(e => e);
    const unknown = await uc.loginUser({email: 'ghost@x.io', password: 'nope'}).catch(e => e);

    assert.ok(wrong instanceof InvalidCredentialsError && unknown instanceof InvalidCredentialsError);
    assert.strictEqual(wrong.message, unknown.message);
    assert.deepStrictEqual(f.verifyCalls, ['hashed:secret123', null], 'hash check runs even for unknown email');
  });

  await t.test('getCurrentUser should return profile or throw UserNotFoundError', async () => {
    const uc = makeAuthUseCases(createFakes());
    await uc.registerUser({name: 'Ann', email: 'a@x.io', password: 'secret123'});
    assert.strictEqual((await uc.getCurrentUser({userId: 1})).name, 'Ann');
    await assert.rejects(uc.getCurrentUser({userId: 99}), UserNotFoundError);
  });
});

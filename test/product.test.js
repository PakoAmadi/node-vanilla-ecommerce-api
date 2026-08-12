'use strict';

const test = require('node:test');
const assert = require('node:assert');
require('../src/config/env')();
const db = require('../src/database/db');

test('Product handler integration', async(t) => {
  t.before(async () => {
    await db.connect();
  });

  t.after(async () => {
    await db.disconnect();
  });

  await t.test('', () => {})
})

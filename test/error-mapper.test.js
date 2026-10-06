'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {mapError} = require('../src/interfaces/http/errorMapper');
const RouterDispatcher = require('../src/router/router.dispatcher');
const {ConflictError} = require('../src/errors/errors');
const {
  DomainError, EmptyCartError, InsufficientStockError, InvalidProductIdError,
  InvalidQuantityError, ProductNotFoundError, CartItemNotFoundError
} = require('../src/domain/errors');

test('HTTP error mapper', async (t) => {
  await t.test('should keep HttpError status codes', () => {
    assert.deepStrictEqual(mapError(new ConflictError('dup')), {statusCode: 409, message: 'dup'});
  });

  await t.test('should map domain errors to 400', () => {
    assert.strictEqual(mapError(new EmptyCartError()).statusCode, 400);
    assert.strictEqual(mapError(new InsufficientStockError()).statusCode, 400);
    assert.strictEqual(mapError(new InvalidProductIdError()).statusCode, 400);
    assert.strictEqual(mapError(new InvalidQuantityError()).statusCode, 400);
    assert.strictEqual(mapError(new DomainError('any rule')).statusCode, 400);
  });

  await t.test('should map "not found" domain errors to 404', () => {
    assert.strictEqual(mapError(new ProductNotFoundError()).statusCode, 404);
    assert.strictEqual(mapError(new CartItemNotFoundError()).statusCode, 404);
  });

  await t.test('should return null for unexpected errors', () => {
    assert.strictEqual(mapError(new Error('boom')), null);
  });

  await t.test('RouterDispatcher should respond 400 with domain error message', async () => {
    const dispatcher = new RouterDispatcher({
      lookup: () => ({handler: async () => { throw new EmptyCartError(); }, params: {}})
    });
    const res = {
      statusCode: null, body: null,
      writeHead(s) { this.statusCode = s; },
      end(d) { this.body = JSON.parse(d); }
    };

    await dispatcher.dispatch({url: '/api/orders', method: 'POST'}, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Cannot checkout an empty cart');
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {mapError} = require('../src/interfaces/http/errorMapper');
const RouterDispatcher = require('../src/interfaces/http/router/RouterDispatcher');
const {ConflictError, ValidationError, BadRequestError} = require('../src/interfaces/http/errors');
const E = require('../src/domain/errors');

test('HTTP error mapper', async (t) => {
  const status = (err) => mapError(err).statusCode;

  await t.test('should keep HttpError status codes and add machine code', () => {
    assert.deepStrictEqual(mapError(new ConflictError('dup')), {statusCode: 409, body: {error: 'dup', code: 'CONFLICT'}});
  });

  await t.test('ValidationError should stay a BadRequestError and expose details', () => {
    const err = new ValidationError({email: 'Invalid email format'});
    assert.ok(err instanceof BadRequestError);
    assert.deepStrictEqual(mapError(err), {
      statusCode: 400,
      body: {
        error: JSON.stringify({validationErrors: {email: 'Invalid email format'}}),
        code: 'VALIDATION_ERROR',
        details: {email: 'Invalid email format'}
      }
    });
  });

  await t.test('should map domain errors to their statuses', () => {
    assert.strictEqual(status(new E.EmptyCartError()), 400);
    assert.strictEqual(status(new E.InsufficientStockError()), 400);
    assert.strictEqual(status(new E.InvalidProductIdError()), 400);
    assert.strictEqual(status(new E.InvalidQuantityError()), 400);
    assert.strictEqual(status(new E.InvalidProductError({})), 400);
    assert.strictEqual(status(new E.ProductNotFoundError()), 404);
    assert.strictEqual(status(new E.CartItemNotFoundError()), 404);
    assert.strictEqual(status(new E.UserNotFoundError()), 404);
    assert.strictEqual(status(new E.ProductTitleTakenError()), 409);
    assert.strictEqual(status(new E.EmailAlreadyTakenError()), 409);
    assert.strictEqual(status(new E.InvalidCredentialsError()), 401);
    assert.strictEqual(status(new E.DomainError('any rule')), 400);
  });

  await t.test('every domain error class should have a unique code', () => {
    const classes = Object.values(E).filter(C => C !== E.DomainError);
    const codes = classes.map(C => C.code);
    assert.ok(codes.every(c => typeof c === 'string' && /^[A-Z_]+$/.test(c)));
    assert.strictEqual(new Set(codes).size, codes.length);
  });

  await t.test('should include code and details in the body', () => {
    const {body} = mapError(E.InsufficientStockError.forProduct('Book', 2));
    assert.deepStrictEqual(body, {
      error: 'Not enough stock for product: Book. Available: 2',
      code: 'INSUFFICIENT_STOCK',
      details: {title: 'Book', available: 2}
    });
  });

  await t.test('a subclass of a mapped error should inherit its status', () => {
    class DiscontinuedProductError extends E.ProductNotFoundError {
      static code = 'PRODUCT_DISCONTINUED';
    }
    const mapped = mapError(new DiscontinuedProductError());
    assert.strictEqual(mapped.statusCode, 404);
    assert.strictEqual(mapped.body.code, 'PRODUCT_DISCONTINUED');
  });

  await t.test('should return null for unexpected errors', () => {
    assert.strictEqual(mapError(new Error('boom')), null);
  });

  await t.test('RouterDispatcher should respond with mapped body', async () => {
    const dispatcher = new RouterDispatcher({
      lookup: () => ({handler: async () => { throw new E.EmptyCartError(); }, params: {}})
    });
    const res = {
      statusCode: null, body: null,
      writeHead(s) { this.statusCode = s; },
      end(d) { this.body = JSON.parse(d); }
    };

    await dispatcher.dispatch({url: '/api/orders', method: 'POST'}, res);

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {error: 'Cannot checkout an empty cart', code: 'EMPTY_CART'});
  });
});

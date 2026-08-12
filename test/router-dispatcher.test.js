'use strict';

const test = require('node:test');
const assert = require('node:assert');
const RouterDispatcher = require('../src/router/router.dispatcher');

test('Router Dispatcher Module', async (t) => {
  const createMockResponse = () => {
    const res = {
      statusCode: null,
      body: null,
      headersSent: false,
      writeHead(status) {
        this.statusCode = status;
        this.headersSent = true;
      },
      end(data) {
        this.body = JSON.parse(data);
      }
    };
    return res;
  };

  await t.test('should catch METHOD_NOT_ALLOWED from router and return 405 error', async () => {
    const mockRouter = {
      lookup: () => ({error: 'METHOD_NOT_ALLOWED'})
    };
    const mockReq = {url: '/api/auth/register', method: 'GET'};
    const mockRes = createMockResponse();
    const dispatcher = new RouterDispatcher(mockRouter);
    await dispatcher.dispatch(mockReq, mockRes);
  })

  await t.test('should catch NOT_FOUND from router and return 404 error', async () => {
    const mockRouter = {
      lookup: () => ({error: 'NOT_FOUND'})
    };

    const mockReq = {url: '/api/unknown-path', method: 'POST'};
    const mockRes = createMockResponse();

    const dispatcher = new RouterDispatcher(mockRouter);
    await dispatcher.dispatch(mockReq, mockRes);

    assert.strictEqual(mockRes.statusCode, 404);
    assert.strictEqual(mockRes.body.error, 'Route POST /api/unknown-path not found');
  });

  await t.test('should route to handler successfully when match is found', async () => {
    let handlerCalled = false;
    let passedParams = null;

    const mockRouter = {
      lookup: () => ({
        handler: async (req, res, params) => {
          handlerCalled = true;
          passedParams = params;
          res.writeHead(200);
          res.end(JSON.stringify({success: true}));
        },
        params: {id: '99'}
      })
    };

    const mockReq = {url: '/api/products/99', method: 'GET'};
    const mockRes = createMockResponse();

    const dispatcher = new RouterDispatcher(mockRouter);
    await dispatcher.dispatch(mockReq, mockRes);

    assert.strictEqual(handlerCalled, true);
    assert.strictEqual(passedParams.id, '99');
    assert.strictEqual(mockRes.statusCode, 200);
    assert.strictEqual(mockRes.body.success, true);
  });

  await t.test('should safely catch critical 500 error if handler crashes', async () => {
    const mockRouter = {
      lookup: () => ({
        handler: async () => {
          throw new Error('Database connection lost');
        },
        params: {}
      })
    };

    const mockReq = {url: '/api/auth/register', method: 'POST'};
    const mockRes = createMockResponse();

    const originalConsoleError = console.error;
    console.error = () => {
    };

    const dispatcher = new RouterDispatcher(mockRouter);
    await dispatcher.dispatch(mockReq, mockRes);

    console.error = originalConsoleError;

    assert.strictEqual(mockRes.statusCode, 500);
    assert.strictEqual(mockRes.body.error, 'Internal Server Error');
  });

})
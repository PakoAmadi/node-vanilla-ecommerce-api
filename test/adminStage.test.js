'use strict';

const test = require('node:test');
const assert = require('node:assert');
const adminStage = require('../src/utils/adminStage');
const { ForbiddenError, UnauthorizedError } = require('../src/errors/errors');

test('Admin Role Verification Stage', async (t) => {

  /**
   * Pure factory function to generate fresh, isolated arguments for each test case.
   * This avoids using shared state hooks and eliminates Temporal Dead Zone or undefined errors.
   */
  const createExecutionArgs = () => {
    return {
      mockReq: {},
      mockRes: {},
      mockParams: {}
    };
  };

  await t.test('should successfully pass if user payload contains admin role', async () => {
    const { mockReq, mockRes, mockParams } = createExecutionArgs();

    // Assemble valid context mimicking a successful upstream token verification
    const ctx = {
      user: { id: 1, role: 'admin' }
    };

    // Execute stage and capture the returned context object
    const nextCtx = await adminStage(mockReq, mockRes, mockParams, ctx);

    // Assert that the pipeline is not aborted and context is preserved intact
    assert.ok(nextCtx);
    assert.strictEqual(nextCtx.user.role, 'admin');
  });

  await t.test('should throw ForbiddenError (403) if user role is customer', async () => {
    const { mockReq, mockRes, mockParams } = createExecutionArgs();

    // Assemble a context containing standard user privileges
    const ctx = {
      user: { id: 2, role: 'customer' }
    };

    // Assert that the functional pipeline correctly aborts execution
    await assert.rejects(
      async () => {
        await adminStage(mockReq, mockRes, mockParams, ctx);
      },
      (err) => {
        // Ensure the correct custom semantic exception is thrown
        assert.ok(err instanceof ForbiddenError);
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.message, 'Access denied: Admin privileges required');
        return true;
      }
    );
  });

  await t.test('should throw UnauthorizedError (401) if authStage was skipped or context is missing', async () => {
    const { mockReq, mockRes, mockParams } = createExecutionArgs();

    // Emulate architectural misconfiguration where ctx is completely missing
    const emptyCtx = null;

    await assert.rejects(
      async () => {
        await adminStage(mockReq, mockRes, mockParams, emptyCtx);
      },
      (err) => {
        // The Fail-Fast system must secure the path and enforce authorization order constraints
        assert.ok(err instanceof UnauthorizedError);
        assert.strictEqual(err.statusCode, 401);
        assert.strictEqual(err.message, 'Authentication required before role verification');
        return true;
      }
    );
  });

});

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const loadEnv = require('../src/utils/env')

test('Environment Variables Parser Module', async (t) => {
    let tmpDir;
    let tmpEnvPath;

    t.beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
        tmpEnvPath = path.join(tmpDir, '.env');
    })

    t.afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        delete process.env.TEST_PORT;
        delete process.env.TEST_DB_URI;
        delete process.env.TEST_SECRET;
    })

    await t.test('should successfully parse valid key-value pairs', () => {
        const mockContent = `
          TEST_PORT=5000
          TEST_DB_URI=mongodb://localhost:27017/test
        `;
        fs.writeFileSync(tmpEnvPath, mockContent);

        loadEnv(tmpEnvPath);
        console.log(process.env.TEST_PORT)
        assert.strictEqual(process.env.TEST_PORT, '5000');
        assert.strictEqual(process.env.TEST_DB_URI, 'mongodb://localhost:27017/test');
    });
})
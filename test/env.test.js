'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const loadEnv = require('../src/config/env')

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
        assert.strictEqual(process.env.TEST_PORT, '5000');
        assert.strictEqual(process.env.TEST_DB_URI, 'mongodb://localhost:27017/test');
    });

    await t.test('should ignore empty lines and comments', () => {
        const mockContent = '# Comment\nTEST_PORT=5000\n\n# Another\nTEST_SECRET=supersecret';
        fs.writeFileSync(tmpEnvPath, mockContent);

        loadEnv(tmpEnvPath);

        assert.strictEqual(process.env.TEST_PORT, '5000');
        assert.strictEqual(process.env.TEST_SECRET, 'supersecret');
    });

    await t.test('should strip single and double quotes around values', () => {
        const mockContent = 'TEST_PORT="5000"\nTEST_SECRET=\'secret_with_quotes\'';
        fs.writeFileSync(tmpEnvPath, mockContent);

        loadEnv(tmpEnvPath);

        assert.strictEqual(process.env.TEST_PORT, '5000');
        assert.strictEqual(process.env.TEST_SECRET, 'secret_with_quotes');
    });
})
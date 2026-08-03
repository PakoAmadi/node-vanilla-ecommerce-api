'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { validateRegistration } = require('../src/utils/validators/validateRegistration');
const sanitizeRegistrationData = require('../src/utils/sanitizers/sanitizeRegistrationData')
const { BadRequestError } = require('../src/errors/errors');

test('Validation & Sanitization Module', async (t) => {

    await t.test('sanitizeRegistrationData() should trim spaces and lowercase email', () => {
        const rawInput = {
            name: '   John Doe   ',
            email: '  jOhN.DoE@ExAmPlE.cOm  ',
            password: 'secret_password_123'
        };

        const sanitized = sanitizeRegistrationData(rawInput);

        assert.strictEqual(sanitized.name, 'John Doe');
        assert.strictEqual(sanitized.email, 'john.doe@example.com');
        assert.strictEqual(sanitized.password, 'secret_password_123'); // пароль не тримим
    });

    await t.test('sanitizeRegistrationData() should handle missing or invalid types gracefully', () => {
        const rawInput = {
            name: null,
            email: undefined,
            password: 12345 // is not string
        };

        const sanitized = sanitizeRegistrationData(rawInput);

        assert.strictEqual(sanitized.name, '');
        assert.strictEqual(sanitized.email, '');
        assert.strictEqual(sanitized.password, '');
    });

    await t.test('validateRegistration() should pass with valid data', () => {
        const validData = {
            name: 'Alex',
            email: 'alex@example.com',
            password: 'strongpassword123'
        };

        // The function should not throw any exceptions
        assert.doesNotThrow(() => {
            validateRegistration(validData);
        });
    });

    await t.test('validateRegistration() should throw BadRequestError on invalid fields', () => {
        const invalidData = {
            name: 'A', // too short
            email: 'bad-email-format', // no @ for domain
            password: 'short' // less than 8 symbols
        };

        assert.throws(
            () => {
                validateRegistration(invalidData);
            },
            (error) => {
                // We check to make sure that it is indeed our custom error class that is being thrown
                assert.ok(error instanceof BadRequestError);

                // We verify that the error contains valid JSON describing the issues
                const payload = JSON.parse(error.message);
                assert.ok(payload.validationErrors.name);
                assert.ok(payload.validationErrors.email);
                assert.ok(payload.validationErrors.password);

                return true;
            }
        );
    });

});

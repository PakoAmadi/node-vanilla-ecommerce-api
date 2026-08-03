'use strict';

const Router = require('../router/router');
const authHandler = require('../handlers/authHandler');
const sanitizeRegistrationData = require('../utils/sanitizers/sanitizeRegistrationData');
const {validateRegistration} = require('../utils/validators/validateRegistration')
const withValidation = require('../utils/withValidation');

const router = new Router();
router.post('/api/auth/register', withValidation({sanitize: sanitizeRegistrationData, validate: validateRegistration}, authHandler.register))

module.exports = router;
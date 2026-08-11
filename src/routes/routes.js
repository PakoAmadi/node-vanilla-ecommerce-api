'use strict';

const Router = require('../router/router');
const authHandler = require('../handlers/authHandler');
const sanitizeRegistrationData = require('../utils/sanitizers/sanitizeRegistrationData');
const {validateRegistration} = require('../utils/validators/validateRegistration')
const validationStage = require('../utils/validationStage');
const pipe = require('../utils/pipe')

const router = new Router();
router.post('/api/auth/register', pipe(validationStage({ sanitize: sanitizeRegistrationData, validate: validateRegistration }), authHandler.register))

module.exports = router;
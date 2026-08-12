'use strict';

const Router = require('../router/router');
const authHandler = require('../handlers/authHandler');
const userHandler = require('../handlers/userHandler');
const sanitizeRegistrationData = require('../utils/sanitizers/sanitizeRegistrationData');
const {validateRegistration} = require('../utils/validators/validateRegistration')
const validationStage = require('../utils/validationStage');
const authStage = require('../utils/authStage')
const pipe = require('../utils/pipe')
const {sanitizeLoginData} = require("../utils/sanitizers/sanitizeLoginData");
const {validateLogin} = require("../utils/validators/validateLogin");

const router = new Router();
router.post('/api/auth/register', pipe(validationStage({ sanitize: sanitizeRegistrationData, validate: validateRegistration }), authHandler.register))
router.post('/api/auth/login', pipe(validationStage({ sanitize: sanitizeLoginData, validate: validateLogin }), authHandler.login))
router.get('/api/user', pipe(authStage, userHandler.getInfo))

module.exports = router;
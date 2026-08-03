'use strict';

const Router = require('../router/router');
const authHandler = require('../handlers/authHandler');

const router = new Router();
router.post('/api/auth/register', authHandler.register)

module.exports = router;
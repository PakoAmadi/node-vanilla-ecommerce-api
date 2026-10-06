'use strict';

const Router = require('../router/router');
const authHandler = require('../handlers/authHandler');
const userHandler = require('../handlers/userHandler');
const productHandler = require('../handlers/productHandler');
const cartHandler = require('../handlers/cartHandler');
const db = require('../database/db');
const createContainer = require('../container');

const sanitizeRegistrationData = require('../utils/sanitizers/sanitizeRegistrationData');
const sanitizeCartData = require('../utils/sanitizers/sanitizeCartData');
const {validateRegistration} = require('../utils/validators/validateRegistration');
const validationStage = require('../utils/validationStage');
const authStage = require('../utils/authStage');
const adminStage = require('../utils/adminStage');
const pipe = require('../utils/pipe');
const {sanitizeLoginData} = require("../utils/sanitizers/sanitizeLoginData");
const {validateLogin} = require("../utils/validators/validateLogin");
const validateCartInput = require('../utils/validators/validateCartInput');

const {controllers} = createContainer({db});

const router = new Router();
router.post('/api/auth/register', pipe(validationStage({ sanitize: sanitizeRegistrationData, validate: validateRegistration }), authHandler.register))
router.post('/api/auth/login', pipe(validationStage({ sanitize: sanitizeLoginData, validate: validateLogin }), authHandler.login))
router.get('/api/user', pipe(authStage, userHandler.getInfo))
router.get('/api/products', pipe(productHandler.getAll));
router.get('/api/products/:id', pipe(productHandler.getOne));
router.post('/api/products', pipe(authStage, adminStage, productHandler.createOne));
router.put('/api/products/:id', pipe(authStage, adminStage, productHandler.updateOne));
router.delete('/api/products/:id', pipe(authStage, adminStage, productHandler.deleteOne));
router.get('/api/cart', pipe(authStage, cartHandler.getCart));
router.post('/api/cart', pipe(authStage, validationStage({ sanitize: sanitizeCartData, validate: validateCartInput}), cartHandler.addItem));
router.delete('/api/cart/:productId', pipe(authStage, cartHandler.removeItem));
router.post('/api/orders', pipe(authStage, controllers.order.checkout));
router.get('/api/orders', pipe(authStage, controllers.order.getHistory));

module.exports = router;
'use strict';

const Router = require('./router/Router');
const authHandler = require('../../handlers/authHandler');
const userHandler = require('../../handlers/userHandler');
const productHandler = require('../../handlers/productHandler');
const db = require('../../infrastructure/db/db');
const createContainer = require('../../container');

const sanitizeRegistrationData = require('./validation/sanitizeRegistrationData');
const sanitizeCartData = require('./validation/sanitizeCartData');
const {validateRegistration} = require('./validation/validateRegistration');
const validationStage = require('./stages/validationStage');
const authStage = require('./stages/authStage');
const adminStage = require('./stages/adminStage');
const pipe = require('./pipe');
const {sanitizeLoginData} = require("./validation/sanitizeLoginData");
const {validateLogin} = require("./validation/validateLogin");
const validateCartInput = require('./validation/validateCartInput');

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
router.get('/api/cart', pipe(authStage, controllers.cart.getCart));
router.post('/api/cart', pipe(authStage, validationStage({ sanitize: sanitizeCartData, validate: validateCartInput}), controllers.cart.addItem));
router.delete('/api/cart/:productId', pipe(authStage, controllers.cart.removeItem));
router.post('/api/orders', pipe(authStage, controllers.order.checkout));
router.get('/api/orders', pipe(authStage, controllers.order.getHistory));

module.exports = router;
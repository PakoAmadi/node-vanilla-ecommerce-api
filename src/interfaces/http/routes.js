'use strict';

const Router = require('./router/Router');
const pipe = require('./pipe');
const validationStage = require('./stages/validationStage');
const adminStage = require('./stages/adminStage');

const sanitizeRegistrationData = require('./validation/sanitizeRegistrationData');
const {validateRegistration} = require('./validation/validateRegistration');
const {sanitizeLoginData} = require('./validation/sanitizeLoginData');
const {validateLogin} = require('./validation/validateLogin');
const sanitizeCartData = require('./validation/sanitizeCartData');
const validateCartInput = require('./validation/validateCartInput');
const sanitizeProductData = require('./validation/sanitizeProductData');

/**
 * Builds the HTTP route table. Pure wiring: no business logic, no infrastructure.
 *
 * @param {object} deps
 * @param {object} deps.controllers  {auth, product, cart, order}
 * @param {Function} deps.authStage  pipe stage created with a TokenService
 * @returns {Router}
 */
const createRoutes = ({controllers: c, authStage}) => {
  const router = new Router();

  const registration = validationStage({sanitize: sanitizeRegistrationData, validate: validateRegistration});
  const login = validationStage({sanitize: sanitizeLoginData, validate: validateLogin});
  const cartInput = validationStage({sanitize: sanitizeCartData, validate: validateCartInput});
  const productInput = validationStage({sanitize: sanitizeProductData});
  const admin = [authStage, adminStage];

  // Auth & profile
  router.post('/api/auth/register', pipe(registration, c.auth.register));
  router.post('/api/auth/login', pipe(login, c.auth.login));
  router.get('/api/user', pipe(authStage, c.auth.me));

  // Products catalog
  router.get('/api/products', pipe(c.product.getAll));
  router.get('/api/products/:id', pipe(c.product.getOne));
  router.post('/api/products', pipe(...admin, productInput, c.product.createOne));
  router.put('/api/products/:id', pipe(...admin, productInput, c.product.updateOne));
  router.delete('/api/products/:id', pipe(...admin, c.product.deleteOne));

  // Cart
  router.get('/api/cart', pipe(authStage, c.cart.getCart));
  router.post('/api/cart', pipe(authStage, cartInput, c.cart.addItem));
  router.delete('/api/cart/:productId', pipe(authStage, c.cart.removeItem));

  // Orders
  router.post('/api/orders', pipe(authStage, c.order.checkout));
  router.get('/api/orders', pipe(authStage, c.order.getHistory));

  return router;
};

module.exports = createRoutes;

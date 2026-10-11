'use strict';

// Composition Root: the only place where concrete implementations are wired
// to use cases that depend on abstractions (ports). Nothing else uses `new Pg...`.

const {loadConfig} = require('./infrastructure/config/config');
const PgUnitOfWork = require('./infrastructure/db/PgUnitOfWork');
const PgOrderRepository = require('./infrastructure/db/repositories/PgOrderRepository');
const PgCartRepository = require('./infrastructure/db/repositories/PgCartRepository');
const PgProductRepository = require('./infrastructure/db/repositories/PgProductRepository');
const PgUserRepository = require('./infrastructure/db/repositories/PgUserRepository');
const ScryptPasswordHasher = require('./infrastructure/security/ScryptPasswordHasher');
const HmacTokenService = require('./infrastructure/security/HmacTokenService');

const makeCheckout = require('./application/orders/checkout');
const makeGetOrderHistory = require('./application/orders/getOrderHistory');
const makeGetCart = require('./application/cart/getCart');
const makeAddItemToCart = require('./application/cart/addItemToCart');
const makeRemoveItemFromCart = require('./application/cart/removeItemFromCart');
const makeProductUseCases = require('./application/products/productUseCases');
const makeAuthUseCases = require('./application/auth/authUseCases');

const makeOrderController = require('./interfaces/http/controllers/orderController');
const makeCartController = require('./interfaces/http/controllers/cartController');
const makeProductController = require('./interfaces/http/controllers/productController');
const makeAuthController = require('./interfaces/http/controllers/authController');
const makeAuthStage = require('./interfaces/http/stages/authStage');
const createRoutes = require('./interfaces/http/routes');

/**
 * @param {object} deps
 * @param {import('./infrastructure/db/db')} deps.db
 * @param {ReturnType<typeof loadConfig>} [deps.config]
 */
const createContainer = ({db, config = loadConfig()}) => {
  // ---- infrastructure ----
  const uow = new PgUnitOfWork(db);
  const orderRepository = new PgOrderRepository(db);
  const cartRepository = new PgCartRepository(db);
  const productRepository = new PgProductRepository(db);
  const userRepository = new PgUserRepository(db);
  const passwords = new ScryptPasswordHasher();
  const tokens = new HmacTokenService(config.jwt);

  // ---- application ----
  const orders = {
    checkout: makeCheckout({uow}),
    getOrderHistory: makeGetOrderHistory({orders: orderRepository})
  };
  const cart = {
    getCart: makeGetCart({carts: cartRepository}),
    addItemToCart: makeAddItemToCart({uow}),
    removeItemFromCart: makeRemoveItemFromCart({carts: cartRepository})
  };
  const products = makeProductUseCases({products: productRepository});
  const auth = makeAuthUseCases({users: userRepository, passwords, tokens});

  // ---- interfaces ----
  const controllers = {
    order: makeOrderController(orders),
    cart: makeCartController(cart),
    product: makeProductController(products),
    auth: makeAuthController(auth)
  };
  const authStage = makeAuthStage({tokens});
  const router = createRoutes({controllers, authStage});

  return {
    config,
    services: {tokens, passwords},
    useCases: {...orders, ...cart, ...products, ...auth},
    controllers,
    router
  };
};

module.exports = createContainer;

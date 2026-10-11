# node-vanilla-ecommerce-api

A high-performance E-commerce RESTful API built entirely from scratch with **pure Node.js** (no Express, Fastify, or other third-party HTTP frameworks), structured according to **Clean Architecture** (Robert C. Martin): the business core does not know about HTTP, SQL or the JWT library — those are replaceable details plugged in from the outside.

## 🚀 Key Technical Highlights

* **Clean Architecture**: Business rules (entities, use cases) are independent of HTTP, PostgreSQL and crypto. Dependencies point only inwards — enforced by an automated architecture test.
* **Zero-Dependency Core Framework**: Built using native Node.js core modules (`node:http`, `node:crypto`, `node:stream`). Zero runtime external dependencies for the application engine.
* **V8 Engine Optimized (Monomorphic Architectures)**: Avoids dynamic object properties mutation on the native `req`/`res` streams. Implements a unified request context object (`ctx`) to maintain static Hidden Classes (Shapes) and maximize inline caching efficiency.
* **Custom RegExp & Map-Based Router**: Blazing fast HTTP request router separating static paths (indexed via native `Map` in O(1) time) and compiled dynamic parameters extraction paths (e.g., `/api/products/:id`).
* **Asynchronous Stream-Based Body Parser**: Efficient, chunked data consumer utilizing modern asynchronous iterators (`for await...of`) equipped with a strict 1MB payload limitation to completely secure the app against memory DoS exploitation.
* **Functional Pipe Pipeline via Reduce**: Flexible, flat middleware/stage pipeline engine utilizing `Array.prototype.reduce` executing sequentially from left-to-right without recursive `next()` callback side-effects.
* **Production-Ready Web Security**: 
  * Linear password salting and hashing utilizing native `node:crypto.scrypt`.
  * Complete protection against Timing Attacks via constant-time buffer comparison (`crypto.timingSafeEqual`).
  * Purely handwritten JWT Generator & Validator compliant with the RFC 7519 security specifications utilizing `base64url` native binary transitions.
* **ACID-Compliant Order Checkout Engine**: The whole checkout runs through a Unit of Work on **one dedicated PostgreSQL connection** (`BEGIN` → `FOR UPDATE` → `COMMIT`). If any product inventory check fails, the entire operational block triggers a strict `ROLLBACK` to preserve data consistency.
* **Race Condition Mitigation (`FOR UPDATE`)**: Utilizes pessimistic row-level locking via PostgreSQL `FOR UPDATE OF` macros during inventory evaluation blocks. This safely queues concurrent purchase requests and eliminates double-spending vulnerabilities (e.g., overselling a single stock entity to parallel client streams).
* **Native Database JSON Aggregation**: Leverages PostgreSQL `json_agg` and `json_build_object` functions within history lookup queries. This offloads relational mapping and arrays reconstruction payloads from the Node.js process layer directly onto the indexed database engine, minimizing Garbage Collector allocation cycles.

## 🛠️ Tech Stack

* **Runtime**: Node.js (v18+)
* **Database**: PostgreSQL (`pg` driver with a connection pool — the only runtime dependency)
* **Testing**: native Node.js test runner (`node:test`, `node:assert`)

## 🧅 Architecture

```text
            ┌──────────────────────────────────────────────┐
            │ interfaces/http   router, pipe, stages,      │
            │                   controllers, presenters,   │
            │                   errorMapper, validation    │
            │   ┌──────────────────────────────────────┐   │
            │   │ application   use cases + ports      │   │
            │   │   ┌──────────────────────────────┐   │   │
            │   │   │ domain   entities, rules,    │   │   │
            │   │   │          money, errors       │   │   │
            │   │   └──────────────────────────────┘   │   │
            │   └──────────────────────────────────────┘   │
            │ infrastructure   Pg repositories, UnitOfWork,│
            │                  scrypt, JWT, config         │
            └──────────────────────────────────────────────┘
            container.js (composition root) wires everything
```

**Dependency Rule** — source code dependencies point only inwards:

| Layer | May depend on | Must not know about |
|---|---|---|
| `domain` | nothing | HTTP, SQL, `process.env`, npm packages |
| `application` | `domain` | HTTP, SQL, concrete implementations (uses **ports**) |
| `infrastructure` | `application` ports, `domain` | HTTP |
| `interfaces/http` | `application`, `domain` | SQL, `pg`, crypto, `process.env` |
| `container.js`, `server.js` | everything | — |

The rule is checked by `test/architecture.test.js` on every `npm test`.

### Request flow

```text
HTTP request
 → RouterDispatcher → Router.lookup
 → pipe(authStage, adminStage, validationStage, controller)   interfaces/http
 → use case (e.g. checkout)                                   application
 → Order.placeFrom / Cart.assertCanAdd / Product.validate     domain
 → UnitOfWork / repositories (ports)                          implemented in infrastructure
 ← domain result → presenter → JSON
 ← DomainError → errorMapper → {error, code, details?} + HTTP status
```

### Project structure

```text
src/
├── domain/                     # pure business rules, no dependencies
│   ├── money.js                # integer-cents arithmetic
│   ├── errors.js               # DomainError + subclasses with stable codes
│   ├── order/Order.js          # placing an order: stock check, price snapshot, total
│   ├── cart/Cart.js            # cart rules: stock incl. cart quantity, totals
│   └── product/Product.js      # product invariants, id parsing
├── application/                # use cases + ports (JSDoc contracts)
│   ├── orders/  cart/  products/  auth/
├── infrastructure/             # details: DB, crypto, config
│   ├── config/                 # loadEnv (.env parser), loadConfig (immutable config)
│   ├── db/                     # db pool, PgUnitOfWork, Pg*Repository
│   └── security/               # hash.js, jwt.js + ScryptPasswordHasher, HmacTokenService
├── interfaces/http/            # delivery mechanism
│   ├── router/                 # Router (Map + RegExp), RouterDispatcher
│   ├── stages/                 # authStage, adminStage, validationStage
│   ├── validation/             # sanitizers & validators of request bodies
│   ├── controllers/  presenters/
│   ├── errors.js               # HttpError hierarchy
│   ├── errorMapper.js          # DomainError/HttpError → status + body
│   ├── pipe.js  readJsonBody.js  routes.js
├── container.js                # composition root
└── server.js                   # bootstrap & graceful shutdown
```

## ⚙️ Installation & Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/PakoAmadi/node-vanilla-ecommerce-api.git
   cd node-vanilla-ecommerce-api
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` in the project root
   (`src/.env` is still read as a legacy fallback):
   ```env
   PORT=5000
   NODE_ENV=development
   PG_HOST=localhost
   PG_PORT=5432
   PG_USER=postgres
   PG_PASSWORD=your_secure_password
   PG_DB_NAME=vanilla_ecommerce
   JWT_SECRET=your_ultra_secure_secret_string
   JWT_EXPIRES_IN_SECONDS=3600
   ```
   `JWT_SECRET` is **required** with `NODE_ENV=production` — the server refuses to start without it.
   In development a built-in insecure default is used. `JWT_TOKEN_SECRET` is accepted as a legacy alias.

3. **Run** (tables and indexes are created automatically on startup):
   ```bash
   npm start      # production
   npm run dev    # node --watch
   ```

## 🧪 Testing

```bash
npm test
```

| Kind | Files | Needs PostgreSQL |
|---|---|---|
| Domain rules | `*.entity.test.js`, `config`, `jwt`, `hash`, `verify`, `env`, `security-adapters` | no |
| Use cases with in-memory fakes of the ports | `*.usecases.test.js` | no |
| HTTP adapters | `router-dispatcher`, `error-mapper`, `adminStage`, `registration-validator` | no |
| Architecture (Dependency Rule) | `architecture.test.js` | no |
| Integration: real repositories, transactions, concurrency, full HTTP flow | `order`, `cart`, `product`, `auth`, `db` | **yes** |

Integration suites create their own uniquely named users/products and delete them afterwards,
so they can run in parallel against a shared development database.
Concurrency tests cover the checkout of the last unit by several buyers and parallel cart updates.

## 📋 API

All responses are JSON. Errors have one shape:

```json
{ "error": "Not enough stock for product: Book. Available: 2", "code": "INSUFFICIENT_STOCK", "details": { "title": "Book", "available": 2 } }
```

`error` is human-readable, `code` is stable and machine-readable, `details` is optional structured data.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | request body failed validation (`details` = per-field messages) |
| `INVALID_PRODUCT`, `INVALID_PRODUCT_ID`, `INVALID_QUANTITY` | 400 | invalid product data / id / quantity |
| `INSUFFICIENT_STOCK`, `EMPTY_CART` | 400 | business rule violated |
| `UNAUTHORIZED`, `INVALID_CREDENTIALS` | 401 | missing/invalid token, wrong email or password |
| `FORBIDDEN` | 403 | admin role required |
| `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `CART_ITEM_NOT_FOUND`, `USER_NOT_FOUND` | 404 | |
| `METHOD_NOT_ALLOWED` | 405 | |
| `EMAIL_TAKEN`, `PRODUCT_TITLE_TAKEN` | 409 | uniqueness conflict |
| `PAYLOAD_TOO_LARGE` | 413 | body over 1 MB |
| `INTERNAL_ERROR` | 500 | unexpected error (details are only logged) |

### Auth & profile
* `POST /api/auth/register` — `{name, email, password}` → **201** `{message, user}`. Email is normalised to lower case, password stored as scrypt `salt:hash`.
* `POST /api/auth/login` — `{email, password}` → **200** `{token, user}`. Unknown email and wrong password produce the same response and take the same time.
* `GET /api/user` 🔒 — current user's profile `{user}`.

### Products
* `GET /api/products` — list, newest first.
* `GET /api/products/:id` — one product.
* `POST /api/products` 🔒👑 — `{title, description?, price, stock}` → **201**.
* `PUT /api/products/:id` 🔒👑 — full replacement of the same fields.
* `DELETE /api/products/:id` 🔒👑

### Cart 🔒
* `GET /api/cart` — `{cart: [...], total_cart_price}`, totals computed in integer cents.
* `POST /api/cart` — `{productId, quantity}`; quantity already in the cart counts against stock. Safe under concurrent requests.
* `DELETE /api/cart/:productId`

### Orders 🔒
* `POST /api/orders` — checkout: locks product rows, validates stock, snapshots title and price, decreases stock and clears the cart in one transaction → **201**.
* `GET /api/orders` — order history with items aggregated by PostgreSQL `json_agg`.

🔒 requires `Authorization: Bearer <token>` · 👑 requires role `admin`

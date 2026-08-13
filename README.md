# node-vanilla-ecommerce-api

A high-performance, enterprise-grade E-commerce RESTful API built entirely from scratch with **pure Node.js** (no Express, Fastify, or other third-party HTTP frameworks). This project highlights architectural maturity, clean separation of concerns via a robust **Layered Architecture**, and deep execution optimizations for the JavaScript JIT-compiler (V8).

## 🚀 Key Technical Highlights

* **Zero-Dependency Core Framework**: Built using native Node.js core modules (`node:http`, `node:crypto`, `node:stream`). Zero runtime external dependencies for the application engine.
* **V8 Engine Optimized (Monomorphic Architectures)**: Avoids dynamic object properties mutation on the native `req`/`res` streams. Implements a unified request context object (`ctx`) to maintain static Hidden Classes (Shapes) and maximize inline caching efficiency.
* **Custom RegExp & Map-Based Router**: Blazing fast HTTP request router separating static paths (indexed via native `Map` in O(1) time) and compiled dynamic parameters extraction paths (e.g., `/api/products/:id`).
* **Asynchronous Stream-Based Body Parser**: Efficient, chunked data consumer utilizing modern asynchronous iterators (`for await...of`) equipped with a strict 1MB payload limitation to completely secure the app against memory DoS exploitation.
* **Functional Pipe Pipeline via Reduce**: Flexible, flat middleware/stage pipeline engine utilizing `Array.prototype.reduce` executing sequentially from left-to-right without recursive `next()` callback side-effects.
* **Production-Ready Web Security**: 
  * Linear password salting and hashing utilizing native `node:crypto.scrypt`.
  * Complete protection against Timing Attacks via constant-time buffer comparison (`crypto.timingSafeEqual`).
  * Purely handwritten JWT Generator & Validator compliant with the RFC 7519 security specifications utilizing `base64url` native binary transitions.
* **ACID-Compliant Order Checkout Engine**: Implements a bulletproof transaction system inside a single PostgreSQL connection pipeline. If any product inventory check fails, the entire operational block triggers a strict `ROLLBACK` to preserve data consistency.
* **Race Condition Mitigation (`FOR UPDATE`)**: Utilizes pessimistic row-level locking via PostgreSQL `FOR UPDATE OF` macros during inventory evaluation blocks. This safely queues concurrent purchase requests and eliminates double-spending vulnerabilities (e.g., overselling a single stock entity to parallel client streams).
* **Native Database JSON Aggregation**: Leverages PostgreSQL `json_agg` and `json_build_object` functions within history lookup queries. This offloads relational mapping and arrays reconstruction payloads from the Node.js process layer directly onto the indexed database engine, minimizing Garbage Collector allocation cycles.

## 🛠️ Tech Stack

* **Runtime Environments**: Node.js (v18+)
* **Database Management**: PostgreSQL (Native Client Package Only, `pg` Pool)
* **Testing Suite**: Native Node.js Test Runner (`node:test` and `node:assert`)

## 📁 Layered Software Architecture

```text
src/
├── config/        # System configuration parsing (.env file handwritten parser)
├── database/      # Database Pool management, automatic schema initialization & indexes
├── dispatcher/    # REST-protocol handlers routing abstraction layer (SOLID Bridge)
├── errors/        # Monomorphic custom OOP error classes inheritance structure
├── handlers/      # Decoupled business controllers (Auth, Products, Cart)
├── router/        # Fast HTTP lookup indexing matching engine
├── utils/         # Performance optimization helpers (JWT, Hashing, Stream Parsers)
└── server.js      # Server initialization, application bootstrapping & Graceful Shutdown
```

## ⚙️ Installation & Database Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd node-vanilla-ecommerce-api
   ```

2. **Install driver dependencies:**
   ```bash
   npm install
   ```

3. **Configure the Environment variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   PG_HOST=localhost
   PG_PORT=5432
   PG_USER=postgres
   PG_PASSWORD=your_secure_password
   PG_DB_NAME=vanilla_ecommerce
   JWT_SECRET=your_ultra_secure_secret_string
   ```

4. **Boot up the server:**
   ```bash
   # Production script
   npm start
   
   # Live development reload with native Node --watch flag
   npm run dev
   ```

## 🧪 Testing Suite (100% Native Integration)

The database suite executes integration tests utilizing the atomic **SQL Transaction isolation pattern (`BEGIN` / `ROLLBACK`)**. This guarantees that all functional integrations interact with a physical database without contaminating tables state.

Run the test suite across all architecture components (`hash`, `env`, `dispatcher`, `router`, `validator`, `jwt`, `database`):
```bash
npm test
```

## 📋 Core API Contracts Architecture

### Authentication Context
* `POST /api/auth/register` — Registers user, hashes password via scrypt. Includes server-side normalization and sanitization.
* `POST /api/auth/login` — Verifies authorization details against constant-time hashes, signs and returns native JWT token.

### Products Catalog Context
* `GET /api/products` — Fetches complete dynamic listing of products.
* `GET /api/products/:id` — Retreives single specialized entity payload parsing the dynamic URL.
* `POST /api/products` — Creates product entry (*Admin Guard Protected*).
* `PUT /api/products/:id` — Full property entity modification payload overwrite (*Admin Guard Protected*).
* `DELETE /api/products/:id` — Purges item from store ledger (*Admin Guard Protected*).

### Shopping Cart Context
* `GET /api/cart` — Aggregates authenticated user items matching PostgreSQL relational references and tallies costs live via JOIN queries.
* `POST /api/cart` — Executes an atomic SQL `UPSERT` operation adding an item or mutating rows quantity safely.
* `DELETE /api/cart/:productId` — Removes items allocation from active user cart.

### Orders & Checkout Context (Protected via Functional Pipe)
* `POST /api/orders` — Atomically processes current user cart metrics, validates strict inventory bounds, performs stock ledger deductions, logs historic unit pricing snapshots, and purges the active cart entity within an isolated ACID block.
* `GET /api/orders` — Pulls aggregated user purchases records mapped as nested native JSON datasets directly returned from the SQL database cluster.

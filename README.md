# node-vanilla-ecommerce-api

A high-performance, production-ready E-commerce RESTful API built entirely with **pure Node.js** (no Express, Fastify, or other HTTP frameworks). This project demonstrates a deep understanding of Node.js core modules, asynchronous streams, custom routing, and clean software architecture.

## 🚀 Key Features

* **Zero Dependencies Framework**: Built using native Node.js core modules (`http`, `crypto`, `url`, `stream`).
* **Custom Router**: Lightweight, high-performance HTTP request router handling dynamic paths and methods.
* **Custom Body Parser**: Non-blocking JSON parser utilizing native Node.js streams.
* **Security & Auth**: Secure authentication mechanism (JWT/Custom tokens) with passwords hashed via native `crypto`.
* **E-commerce Engine**: Complete business logic for Products, Shopping Carts, and Order processing.

## 🛠️ Tech Stack

* **Runtime**: Node.js (v18+)
* **Database**: Native MongoDB Driver / PostgreSQL (Client package only)
* **Authentication**: JSON Web Tokens (JWT) / Native Crypto
* **Testing**: Native Node.js Test Runner

## 📁 Architecture

The project follows a decoupled, layered architecture to maintain clean separation of concerns without relying on external frameworks:

```text
src/
├── config/         # System configurations & environment variables
├── database/       # Database connection initialization
├── router/         # Custom HTTP request router logic
├── handlers/       # Request handlers (controllers) separating business logic
├── utils/          # Native helpers (stream body parsers, crypto hashing)
└── server.js       # HTTP server initialization (Entry point)
```

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd node-vanilla-ecommerce-api
   ```

2. **Create environment variables:**
   Create a `.env` file in the root directory (see `.env.example`):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your_super_secret_key
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## 📋 API Endpoints (Brief Overview)

* `POST /api/auth/register` — Register a new user
* `POST /api/auth/login` — Authenticate user & receive token
* `GET /api/products` — Fetch all products (with pagination/filters)
* `POST /api/cart` — Add items to the shopping cart
* `POST /api/orders` — Checkout and place an order

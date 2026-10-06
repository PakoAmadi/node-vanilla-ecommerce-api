'use strict';

// Base class for business-rule violations. Knows nothing about HTTP:
// translation to status codes lives in interfaces/http/errorMapper.js
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class EmptyCartError extends DomainError {
  constructor(message = 'Cannot checkout an empty cart') {
    super(message);
  }
}

class InsufficientStockError extends DomainError {
  constructor(message = 'Transaction aborted: One of the products went out of stock.') {
    super(message);
  }

  static forProduct(title, available) {
    return new InsufficientStockError(`Not enough stock for product: ${title}. Available: ${available}`);
  }
}

class ProductNotFoundError extends DomainError {
  constructor(message = 'Product not found') {
    super(message);
  }
}

class CartItemNotFoundError extends DomainError {
  constructor(message = 'Product not found in your cart') {
    super(message);
  }
}

class InvalidProductIdError extends DomainError {
  constructor(message = 'Valid Product ID is required') {
    super(message);
  }
}

class InvalidQuantityError extends DomainError {
  constructor(message = 'Quantity must be a positive integer greater than 0') {
    super(message);
  }
}

module.exports = {
  DomainError,
  InvalidQuantityError,
  EmptyCartError,
  InsufficientStockError,
  ProductNotFoundError,
  CartItemNotFoundError,
  InvalidProductIdError
};

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

  static forId(id) {
    return new ProductNotFoundError(`Product with ID ${id} not found`);
  }
}

class ProductTitleTakenError extends DomainError {
  constructor(message = 'Product with this name already exists') {
    super(message);
  }
}

// Carries per-field messages: {title: '...', price: '...'}
class InvalidProductError extends DomainError {
  constructor(details = {}) {
    super('Invalid product data');
    this.details = details;
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

class EmailAlreadyTakenError extends DomainError {
  constructor(message = 'User with this email already exists') {
    super(message);
  }
}

// Deliberately does not say whether the email or the password was wrong
class InvalidCredentialsError extends DomainError {
  constructor(message = 'Wrong email or password!') {
    super(message);
  }
}

class UserNotFoundError extends DomainError {
  constructor(message = 'User not found') {
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
  EmailAlreadyTakenError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidQuantityError,
  EmptyCartError,
  InsufficientStockError,
  ProductNotFoundError,
  ProductTitleTakenError,
  InvalidProductError,
  CartItemNotFoundError,
  InvalidProductIdError
};

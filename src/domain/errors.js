'use strict';

/**
 * Base class for business-rule violations. Knows nothing about HTTP:
 * translation to status codes lives in interfaces/http/errorMapper.js.
 *
 * Every subclass declares a stable machine-readable `code` (static),
 * so clients can react to errors without parsing human-readable messages.
 */
class DomainError extends Error {
  static code = 'DOMAIN_ERROR';

  /**
   * @param {string} message human-readable text
   * @param {object} [details] structured data (e.g. per-field validation messages)
   */
  constructor(message, details) {
    super(message);
    this.name = this.constructor.name;
    this.code = this.constructor.code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------- users / auth ----------

class EmailAlreadyTakenError extends DomainError {
  static code = 'EMAIL_TAKEN';
  constructor(message = 'User with this email already exists') {
    super(message);
  }
}

// Deliberately does not say whether the email or the password was wrong
class InvalidCredentialsError extends DomainError {
  static code = 'INVALID_CREDENTIALS';
  constructor(message = 'Wrong email or password!') {
    super(message);
  }
}

class UserNotFoundError extends DomainError {
  static code = 'USER_NOT_FOUND';
  constructor(message = 'User not found') {
    super(message);
  }
}

// ---------- products ----------

class InvalidProductIdError extends DomainError {
  static code = 'INVALID_PRODUCT_ID';
  constructor(message = 'Valid Product ID is required') {
    super(message);
  }
}

class InvalidProductError extends DomainError {
  static code = 'INVALID_PRODUCT';
  /** @param {Record<string,string>} details per-field messages */
  constructor(details = {}) {
    super('Invalid product data', details);
  }
}

class ProductNotFoundError extends DomainError {
  static code = 'PRODUCT_NOT_FOUND';
  constructor(message = 'Product not found') {
    super(message);
  }

  static forId(id) {
    return new ProductNotFoundError(`Product with ID ${id} not found`);
  }
}

class ProductTitleTakenError extends DomainError {
  static code = 'PRODUCT_TITLE_TAKEN';
  constructor(message = 'Product with this name already exists') {
    super(message);
  }
}

// ---------- cart / orders ----------

class InvalidQuantityError extends DomainError {
  static code = 'INVALID_QUANTITY';
  constructor(message = 'Quantity must be a positive integer greater than 0') {
    super(message);
  }
}

class InsufficientStockError extends DomainError {
  static code = 'INSUFFICIENT_STOCK';
  constructor(message = 'Transaction aborted: One of the products went out of stock.', details) {
    super(message, details);
  }

  static forProduct(title, available) {
    return new InsufficientStockError(
      `Not enough stock for product: ${title}. Available: ${available}`,
      {title, available}
    );
  }
}

class CartItemNotFoundError extends DomainError {
  static code = 'CART_ITEM_NOT_FOUND';
  constructor(message = 'Product not found in your cart') {
    super(message);
  }
}

class EmptyCartError extends DomainError {
  static code = 'EMPTY_CART';
  constructor(message = 'Cannot checkout an empty cart') {
    super(message);
  }
}

module.exports = {
  DomainError,
  EmailAlreadyTakenError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidProductIdError,
  InvalidProductError,
  ProductNotFoundError,
  ProductTitleTakenError,
  InvalidQuantityError,
  InsufficientStockError,
  CartItemNotFoundError,
  EmptyCartError
};

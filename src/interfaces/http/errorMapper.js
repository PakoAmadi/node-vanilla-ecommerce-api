'use strict';

const {HttpError} = require('./errors');
const E = require('../../domain/errors');

// Domain error class -> HTTP status. Values keep the existing API contract.
const STATUS_BY_DOMAIN_ERROR = new Map([
  [E.InvalidCredentialsError, 401],
  [E.UserNotFoundError, 404],
  [E.ProductNotFoundError, 404],
  [E.CartItemNotFoundError, 404],
  [E.EmailAlreadyTakenError, 409],
  [E.ProductTitleTakenError, 409],
  [E.InvalidProductIdError, 400],
  [E.InvalidProductError, 400],
  [E.InvalidQuantityError, 400],
  [E.InsufficientStockError, 400],
  [E.EmptyCartError, 400]
]);

const DEFAULT_DOMAIN_STATUS = 400;

// Walks up the prototype chain, so a subclass inherits its parent's status
const statusFor = (error) => {
  for (let C = error.constructor; C && C !== E.DomainError; C = Object.getPrototypeOf(C)) {
    if (STATUS_BY_DOMAIN_ERROR.has(C)) return STATUS_BY_DOMAIN_ERROR.get(C);
  }
  return DEFAULT_DOMAIN_STATUS;
};

/**
 * Translates a thrown error into an HTTP response.
 * Response body: {error: <message>, code: <MACHINE_CODE>, details?: {...}}
 *
 * @param {Error} error
 * @returns {{statusCode:number, body:{error:string, code:string, details?:object}} | null}
 *          null => unexpected error, caller responds 500 and logs it
 */
const mapError = (error) => {
  let statusCode;
  if (error instanceof HttpError) statusCode = error.statusCode;
  else if (error instanceof E.DomainError) statusCode = statusFor(error);
  else return null;

  const body = {error: error.message, code: error.code};
  if (error.details) body.details = error.details;
  return {statusCode, body};
};

module.exports = {mapError};

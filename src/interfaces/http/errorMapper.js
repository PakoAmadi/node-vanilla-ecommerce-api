'use strict';

const {HttpError} = require('../../errors/errors');
const {DomainError, EmptyCartError, InsufficientStockError} = require('../../domain/errors');

// Domain error class -> HTTP status. 400 keeps the existing API contract.
const STATUS_BY_DOMAIN_ERROR = new Map([
  [EmptyCartError, 400],
  [InsufficientStockError, 400]
]);

const DEFAULT_DOMAIN_STATUS = 400;

/**
 * @param {Error} error
 * @returns {{statusCode:number, message:string} | null} null => unexpected error (500)
 */
const mapError = (error) => {
  if (error instanceof HttpError) {
    return {statusCode: error.statusCode, message: error.message};
  }
  if (error instanceof DomainError) {
    return {
      statusCode: STATUS_BY_DOMAIN_ERROR.get(error.constructor) ?? DEFAULT_DOMAIN_STATUS,
      message: error.message
    };
  }
  return null;
};

module.exports = {mapError};

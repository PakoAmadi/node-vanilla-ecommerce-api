'use strict'

//Base class for all API-controlled errors
class HttpError extends Error {
  static code = 'HTTP_ERROR';

  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = this.constructor.code; // machine-readable, sent to clients
    this.statusCode = statusCode // The property is declared directly in the constructor—a stable Shape
    Error.captureStackTrace(this, this.constructor); // Capture the call stack, excluding the error constructor itself
  }
}

// Error: Request body is too large (413)
class PayloadTooLargeError extends HttpError {
  static code = 'PAYLOAD_TOO_LARGE';

  constructor(message = 'Payload Too Large') {
    super(message, 413);
  }
}

// Error: Invalid JSON or incorrect data (400)
class BadRequestError extends HttpError {
  static code = 'BAD_REQUEST';

  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// Error: Route not found (404)
class NotFoundError extends HttpError {
  static code = 'NOT_FOUND';

  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

// Error: Method not supported (405)
class MethodNotAllowedError extends HttpError {
  static code = 'METHOD_NOT_ALLOWED';

  constructor(message = 'Method Not Allowed') {
    super(message, 405);
  }
}

// Error: Conflict error (409)
class ConflictError extends HttpError {
  static code = 'CONFLICT';

  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

// Error: 401 Unauthorized
class UnauthorizedError extends HttpError {
  static code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends HttpError {
  static code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message, 403); // 403 Forbidden
  }
}

// Error: request body failed validation (400). Message kept as JSON string for backward
// compatibility; the same data is available as structured `details`.
class ValidationError extends BadRequestError {
  static code = 'VALIDATION_ERROR';

  /** @param {Record<string,string>} errors per-field messages */
  constructor(errors) {
    super(JSON.stringify({validationErrors: errors}));
    this.details = errors;
  }
}

module.exports = {
  HttpError,
  PayloadTooLargeError,
  BadRequestError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError
};


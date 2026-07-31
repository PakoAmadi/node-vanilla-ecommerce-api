'use strict'

//Base class for all API-controlled errors
class HttpError extends  Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode // The property is declared directly in the constructor—a stable Shape
        Error.captureStackTrace(this, this.constructor); // Capture the call stack, excluding the error constructor itself
    }
}

// Error: Request body is too large (413)
class PayloadTooLargeError extends HttpError {
    constructor(message = 'Payload Too Large') {
        super(message, 413);
    }
}

// Error: Invalid JSON or incorrect data (400)
class BadRequestError extends HttpError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

// Error: Route not found (404)
class NotFoundError extends HttpError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

// Error: Method not supported (405)
class MethodNotAllowedError extends HttpError {
    constructor(message = 'Method Not Allowed') {
        super(message, 405);
    }
}

module.exports = {
    HttpError,
    PayloadTooLargeError,
    BadRequestError,
    NotFoundError,
    MethodNotAllowedError
};


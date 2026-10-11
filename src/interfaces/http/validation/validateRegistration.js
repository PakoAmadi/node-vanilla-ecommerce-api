'use strict';

const {BadRequestError} = require('../errors')

const {EMAIL_REGEX} = require('./constants')

const validateRegistration = (data) => {
  const {name, email, password} = data;
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.email = 'Invalid email format';
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestError(JSON.stringify({validationErrors: errors}));
  }
};

module.exports = {
  validateRegistration
}
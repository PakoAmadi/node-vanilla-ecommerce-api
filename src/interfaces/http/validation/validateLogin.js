'use strict';

const {BadRequestError} = require('../errors')
const {EMAIL_REGEX} = require('./constants')

const validateLogin = (data) => {
  const {email, password} = data;

  const errors = {};

  if (!email || !password) {
    errors.credentials = 'Email and password are required'
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
}

module.exports = {validateLogin}
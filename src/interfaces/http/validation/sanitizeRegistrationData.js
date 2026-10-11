'use strict';

const sanitizeRegistrationData = (rawParams) => {
  return {
    name: typeof rawParams.name === 'string' ? rawParams.name.trim() : '',
    email: typeof rawParams.email === 'string' ? rawParams.email.trim().toLowerCase() : '',
    password: typeof rawParams.password === 'string' ? rawParams.password : ''
  };
};

module.exports = sanitizeRegistrationData
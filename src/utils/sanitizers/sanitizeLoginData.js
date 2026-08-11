'use strict';

const sanitizeLoginData = (rawParams) => {
    return {
        email: typeof rawParams.email === 'string' ? rawParams.email.trim().toLowerCase() : '',
        password: typeof rawParams.password === 'string' ? rawParams.password : ''
    };
}

module.exports = { sanitizeLoginData }
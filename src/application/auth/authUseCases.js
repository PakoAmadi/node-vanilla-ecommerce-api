'use strict';

const {InvalidCredentialsError, UserNotFoundError} = require('../../domain/errors');

/**
 * Authentication and profile use cases.
 * Input is expected to be sanitised/validated at the boundary (HTTP validators).
 *
 * @param {object} deps
 * @param {import('./ports').UserRepository} deps.users
 * @param {import('./ports').PasswordHasher} deps.passwords
 * @param {import('./ports').TokenService} deps.tokens
 */
const makeAuthUseCases = ({users, passwords, tokens}) => ({
  async registerUser({name, email, password}) {
    const passwordHash = await passwords.hash(password);
    return users.create({name, email, passwordHash});
  },

  async loginUser({email, password}) {
    const found = await users.findByEmail(email);

    // Always run the hash check (also for unknown emails) — constant-time behaviour
    const matched = await passwords.verify(password, found ? found.passwordHash : null);
    if (!found || !matched) throw new InvalidCredentialsError();

    const {passwordHash, ...user} = found;
    const token = tokens.issue({id: user.id, role: user.role});
    return {token, user};
  },

  async getCurrentUser({userId}) {
    const user = await users.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }
});

module.exports = makeAuthUseCases;

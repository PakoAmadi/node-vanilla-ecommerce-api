'use strict';

const DEV_JWT_SECRET = 'super_secret_key';

/**
 * Builds an immutable application config from environment variables.
 * The only module (together with db.js) that reads process.env.
 *
 * @param {NodeJS.ProcessEnv} env
 */
const loadConfig = (env = process.env) => {
  const nodeEnv = env.NODE_ENV || 'development';

  // JWT_SECRET is documented in README; JWT_TOKEN_SECRET is accepted for backward compatibility
  let jwtSecret = env.JWT_SECRET || env.JWT_TOKEN_SECRET;
  if (!jwtSecret) {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    jwtSecret = DEV_JWT_SECRET;
  }

  return Object.freeze({
    nodeEnv,
    port: Number(env.PORT) || 5000,
    jwt: Object.freeze({
      secret: jwtSecret,
      expiresInSeconds: Number(env.JWT_EXPIRES_IN_SECONDS) || 3600
    })
  });
};

module.exports = {loadConfig};

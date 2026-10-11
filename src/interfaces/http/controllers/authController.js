'use strict';

const {presentRegistered, presentLoggedIn, presentCurrentUser} = require('../presenters/userPresenter');

const send = (res, status, body) => {
  res.writeHead(status);
  res.end(JSON.stringify(body));
};

/**
 * @param {ReturnType<import('../../../application/auth/authUseCases')>} useCases
 */
const makeAuthController = ({registerUser, loginUser, getCurrentUser}) => ({
  async register(req, res, params, ctx) {
    send(res, 201, presentRegistered(await registerUser(ctx.body)));
  },

  async login(req, res, params, ctx) {
    send(res, 200, presentLoggedIn(await loginUser(ctx.body)));
  },

  async me(req, res, params, ctx) {
    send(res, 200, presentCurrentUser(await getCurrentUser({userId: ctx.user.id})));
  }
});

module.exports = makeAuthController;

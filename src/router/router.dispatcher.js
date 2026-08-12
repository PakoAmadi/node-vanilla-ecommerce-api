'use strict'

const {HttpError, MethodNotAllowedError, NotFoundError} = require("../errors/errors");

module.exports = class RouterDispatcher {
  constructor(router) {
    this.router = router
  }

  async dispatch(req, res) {
    try {
      const [pathname] = req.url.split('?');
      const match = this.router.lookup(req.method, pathname);

      if (match.error === 'METHOD_NOT_ALLOWED') {
        throw new MethodNotAllowedError(`Method ${req.method} not allowed`);
      }

      if (match.error === 'NOT_FOUND') {
        throw new NotFoundError(`Route ${req.method} ${pathname} not found`);
      }

      await match.handler(req, res, match.params);
    } catch (error) {
      this.#handleError(res, error);
    }
  }

  #handleError(res, error) {
    if (error instanceof HttpError) {
      res.writeHead(error.statusCode);
      return res.end(JSON.stringify({error: error.message}));
    }

    console.error('[CRITICAL SERVER ERROR]:', error.stack);
    res.writeHead(500);
    res.end(JSON.stringify({error: 'Internal Server Error'}));
  }
}
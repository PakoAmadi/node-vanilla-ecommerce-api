'use strict';

const userHandler = {
  getInfo(req, res, params, ctx) {
    res.writeHead(200);
    res.end('User info')
  }
}

module.exports = userHandler
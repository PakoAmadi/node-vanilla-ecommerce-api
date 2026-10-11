'use strict';

const http = require('node:http');
const loadEnv = require('./infrastructure/config/loadEnv');
loadEnv();

const {loadConfig} = require('./infrastructure/config/config');
const db = require('./infrastructure/db/db');
const createContainer = require('./container');
const RouterDispatcher = require('./interfaces/http/router/RouterDispatcher');

const SHUTDOWN_TIMEOUT_MS = 10000;

const bootstrap = async () => {
  let server;

  try {
    const config = loadConfig();
    const {router} = createContainer({db, config});
    const dispatcher = new RouterDispatcher(router);

    server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      await dispatcher.dispatch(req, res);
    });

    await db.connect();
    server.listen(config.port, () => {
      console.log(`[SERVER]: Running on port ${config.port}`);
    });
  } catch (error) {
    console.error('[CRITICAL BOOTSTRAP ERROR]:', error.message);
    process.exit(1);
  }

  const gracefulShutdown = (signal) => {
    console.log(`\n[SERVER]: Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('[SERVER]: HTTP server closed.');
      try {
        await db.disconnect();
        console.log('[SERVER]: Graceful shutdown complete. Exiting process.');
        process.exit(0);
      } catch (error) {
        console.error('[SERVER ERROR]: Error during disconnect:', error.message);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('[SERVER ERROR]: Forcefully shutting down due to timeout.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

bootstrap();

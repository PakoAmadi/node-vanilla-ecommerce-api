const http = require('node:http')
const loadEnv = require('./infrastructure/config/loadEnv');
loadEnv()
const router = require('./interfaces/http/routes');
const RouterDispatcher = require('./interfaces/http/router/RouterDispatcher');
const db = require('./infrastructure/db/db');

const PORT = process.env.PORT || 5000;
const dispatcher = new RouterDispatcher(router)

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  await dispatcher.dispatch(req, res);
})

const bootstrap = async () => {
  try {
    await db.connect();
    server.listen(PORT, () => {
      console.log(`[SERVER]: Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[CRITICAL BOOTSTRAP ERROR]:', error.message);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal) => {
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
  })
  setTimeout(() => {
    console.error('[SERVER ERROR]: Forcefully shutting down due to timeout.');
    process.exit(1);
  }, 10000);
}

bootstrap()

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
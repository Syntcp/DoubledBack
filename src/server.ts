import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

const app = createApp();
const server = http.createServer(app);

// Timeouts & keep-alive (robuste derrière proxy)
server.keepAliveTimeout = 75_000;
server.headersTimeout = 76_000;
server.requestTimeout = 60_000;

server.listen(env.PORT, () => {
  logger.info(`Server on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function closeGracefully(signal: string) {
  logger.info(`${signal} received. Closing gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('✅ Prisma disconnected');
    } catch (e) {
      logger.error({ e }, 'Error during Prisma disconnect');
    } finally {
      logger.info('✅ HTTP server closed. Bye!');
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.error('⏳ Forced exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

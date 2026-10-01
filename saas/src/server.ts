import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { redis } from './database/redis.js';
import { prisma } from './database/prisma.js';
import { ProxyHealthWorker } from './workers/proxyHealthWorker.js';
import { UsageAggregator } from './workers/usageAggregator.js';

async function bootstrap() {
  const app = createApp();

  // Connect Redis
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis initial connection deferred (will retry)');
  }

  // Start background workers
  const healthWorker = new ProxyHealthWorker();
  healthWorker.start(30000);

  const usageAggregator = new UsageAggregator();
  usageAggregator.start(60000);

  // Start HTTP Listener
  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Proxy Redirector SaaS API running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    healthWorker.stop();
    usageAggregator.stop();

    server.close(async () => {
      await redis.quit();
      await prisma.$disconnect();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during SaaS bootstrap');
  process.exit(1);
});

import { prisma } from '../database/prisma.js';
import { redis } from '../database/redis.js';
import { logger } from '../utils/logger.js';

export class UsageAggregator {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 300000) {
    logger.info('Starting Usage Aggregator Worker...');
    this.timer = setInterval(() => this.flushUsage(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async flushUsage() {
    try {
      const keys = await redis.keys('usage:user:*:bytes');
      if (!keys || keys.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const key of keys) {
        const userId = key.split(':')[2];
        const bytesStr = await redis.get(key);
        const bytes = BigInt(bytesStr || '0');

        if (bytes > 0n) {
          await prisma.usageLog.upsert({
            where: {
              userId_date: {
                userId,
                date: today,
              },
            },
            update: {
              bytesTransferred: { increment: bytes },
            },
            create: {
              userId,
              date: today,
              bytesTransferred: bytes,
            },
          });

          await redis.del(key);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in UsageAggregator flush');
    }
  }
}

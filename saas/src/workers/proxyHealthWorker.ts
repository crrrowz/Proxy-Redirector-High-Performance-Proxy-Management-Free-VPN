import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';

export class ProxyHealthWorker {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 60000) {
    logger.info('Starting Proxy Health Background Worker...');
    this.timer = setInterval(() => this.runCheckCycle(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCheckCycle() {
    try {
      const now = new Date();
      // Check stale relays (> 90s without heartbeat)
      const staleThreshold = new Date(now.getTime() - 90000);
      const updated = await prisma.relayServer.updateMany({
        where: {
          lastHeartbeat: { lt: staleThreshold },
          status: 'ONLINE',
        },
        data: {
          status: 'OFFLINE',
        },
      });

      if (updated.count > 0) {
        logger.warn({ count: updated.count }, 'Marked stale relays as OFFLINE');
      }
    } catch (err) {
      logger.error({ err }, 'Error running proxy health check cycle');
    }
  }
}

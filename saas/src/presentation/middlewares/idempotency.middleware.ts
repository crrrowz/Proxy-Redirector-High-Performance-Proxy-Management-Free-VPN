import { Request, Response, NextFunction } from 'express';
import { redis } from '../../database/redis.js';

export function idempotencyGuard(ttlSeconds = 86400) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      return next(); // Proceed normally if no idempotency key is passed
    }

    const redisKey = `idempotency:${idempotencyKey}`;
    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
        return res.status(parsed.status).json(parsed.body);
      }

      // Intercept response JSON to store in Redis
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(redisKey, JSON.stringify({ status: res.statusCode, body }), 'EX', ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch {
      next();
    }
  };
}

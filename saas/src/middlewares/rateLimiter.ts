import { Request, Response, NextFunction } from 'express';
import { redis } from '../database/redis.js';
import { ApiResponse } from '../utils/apiResponse.js';

export function rateLimiter(limit = 100, windowSec = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec * 2);
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

      if (current > limit) {
        return ApiResponse.error(res, 'Too many requests, please slow down', 'RATE_LIMITED', 429);
      }

      next();
    } catch {
      // Allow request if Redis is temporarily unavailable
      next();
    }
  };
}

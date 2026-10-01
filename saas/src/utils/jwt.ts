import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { redis } from '../database/redis.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  jti?: string;
}

export class JwtHelper {
  static signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_TTL_SEC,
    });
  }

  static signRefreshToken(payload: TokenPayload): string {
    const jti = crypto.randomUUID();
    return jwt.sign({ ...payload, jti }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_TTL_SEC,
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
  }

  static async revokeRefreshToken(jti: string, ttlSec = config.JWT_REFRESH_TTL_SEC): Promise<void> {
    if (!jti) return;
    try {
      await redis.set(`token:revoked:${jti}`, '1', 'EX', ttlSec);
    } catch {
      // redis offline fallback
    }
  }

  static async isTokenRevoked(jti?: string): Promise<boolean> {
    if (!jti) return false;
    try {
      const exists = await redis.get(`token:revoked:${jti}`);
      return exists === '1';
    } catch {
      return false;
    }
  }
}

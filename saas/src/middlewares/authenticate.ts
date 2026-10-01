import { Request, Response, NextFunction } from 'express';
import { JwtHelper, TokenPayload } from '../utils/jwt.js';
import { ApiResponse } from '../utils/apiResponse.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Authentication token missing or malformed', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = JwtHelper.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return ApiResponse.error(res, 'Invalid or expired token', 'TOKEN_EXPIRED', 401);
  }
}

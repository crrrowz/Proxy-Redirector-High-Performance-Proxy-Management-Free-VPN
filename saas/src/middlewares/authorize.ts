import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', 'UNAUTHORIZED', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Insufficient permissions', 'FORBIDDEN', 403);
    }

    next();
  };
}

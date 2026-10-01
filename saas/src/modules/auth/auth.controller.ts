import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.register(email, password, name);
      return ApiResponse.success(res, result, 201);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 'REGISTRATION_FAILED', 400);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fingerprint, deviceName, deviceOs } = req.body;
      const result = await AuthService.login(email, password, { fingerprint, deviceName, deviceOs });
      return ApiResponse.success(res, result, 200);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 'AUTH_FAILED', 401);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      return ApiResponse.success(res, result, 200);
    } catch (err: any) {
      return ApiResponse.error(res, err.message, 'REFRESH_FAILED', 401);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
      return ApiResponse.success(res, { message: 'Logged out successfully' });
    } catch (err: any) {
      next(err);
    }
  }
}

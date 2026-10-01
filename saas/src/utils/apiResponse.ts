import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: any;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, meta?: any) {
    return res.status(statusCode).json({
      success: true,
      data,
      meta,
    });
  }

  static error(res: Response, message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: any) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }
}

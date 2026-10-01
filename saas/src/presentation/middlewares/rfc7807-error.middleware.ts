import { Request, Response, NextFunction } from 'express';
import { DomainException } from '../../core/domain/exceptions/domain.exceptions.js';
import { logger } from '../../utils/logger.js';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance: string;
  requestId: string;
  errors?: any;
}

export function rfc7807ErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  if (err instanceof DomainException) {
    const problem: ProblemDetails = {
      type: `https://api.proxyredirector.io/errors/${err.code.toLowerCase().replace(/_/g, '-')}`,
      title: err.name || 'Domain Error',
      status: err.statusCode,
      code: err.code,
      detail: err.message,
      instance: req.originalUrl || req.path,
      requestId,
      errors: err.details,
    };
    return res.status(err.statusCode).contentType('application/problem+json').json(problem);
  }

  // Generic Unhandled Error
  logger.error({ err, path: req.path, requestId }, 'Unhandled Server Exception');

  const problem: ProblemDetails = {
    type: 'https://api.proxyredirector.io/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    detail: 'An unexpected internal error occurred on the server.',
    instance: req.originalUrl || req.path,
    requestId,
  };

  return res.status(500).contentType('application/problem+json').json(problem);
}

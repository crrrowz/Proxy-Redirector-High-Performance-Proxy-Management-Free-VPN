export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundException extends DomainException {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly statusCode = 404;
}

export class ConflictException extends DomainException {
  readonly code = 'RESOURCE_CONFLICT';
  readonly statusCode = 409;
}

export class UnauthorizedException extends DomainException {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;
}

export class ForbiddenException extends DomainException {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
}

export class ValidationException extends DomainException {
  readonly code = 'VALIDATION_FAILED';
  readonly statusCode = 422;
}

export class ServiceUnavailableException extends DomainException {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
}

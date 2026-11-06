import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

// Local error response shape (mirrors ApiError from shared)
interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

/**
 * Central error handling middleware.
 * Maps known errors to consistent API responses.
 * Never leaks stack traces to the client in production.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn({ requestId, err: err.message }, 'Validation error');
    const response: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details },
    };
    res.status(400).json(response);
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, 'Application error');
    } else {
      logger.warn({ requestId, code: err.code, message: err.message }, 'Client error');
    }
    const response: ErrorResponse = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Prisma unique constraint violation
  if (
    err instanceof Error &&
    err.constructor.name === 'PrismaClientKnownRequestError'
  ) {
    const prismaErr = err as Error & { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.[0] ?? 'field';
      const response: ErrorResponse = {
        success: false,
        error: { code: 'CONFLICT', message: `A record with this ${field} already exists` },
      };
      res.status(409).json(response);
      return;
    }
  }

  // Prisma schema validation error (e.g. malformed date or enum)
  if (
    err instanceof Error &&
    (err.name === 'PrismaClientValidationError' ||
      err.constructor.name === 'PrismaClientValidationError')
  ) {
    logger.warn({ requestId, err: err.message }, 'Database validation error');
    const response: ErrorResponse = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid data format provided' },
    };
    res.status(400).json(response);
    return;
  }

  // Unknown errors — never expose internals in production
  logger.error({ requestId, err }, 'Unhandled error');
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}

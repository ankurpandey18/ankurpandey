import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';
import { PermissionKeyType } from '@medstore/shared';
import { logger } from '../config/logger.js';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: string;
    permissions: string[];
    mustChangePassword: boolean;
  }
}

import { prisma } from '../config/database.js';

/**
 * Ensures the request has an active, valid authenticated session.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.session.userId) {
    return next(new UnauthorizedError());
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { status: true, mustChangePassword: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
      return next(new UnauthorizedError('Account is inactive or no longer exists'));
    }

    req.session.mustChangePassword = user.mustChangePassword;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ensures the authenticated user has completed any forced password change.
 */
export function requirePasswordChanged(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.session.mustChangePassword) {
    return next(new ForbiddenError('You must change your password before continuing'));
  }
  next();
}

/**
 * Returns middleware that checks whether the session user holds a specific permission.
 * Always deny-by-default.
 */
export function requirePermission(permission: PermissionKeyType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      return next(new UnauthorizedError());
    }

    const permissions: string[] = req.session.permissions ?? [];
    if (!permissions.includes(permission)) {
      logger.warn(
        {
          userId: req.session.userId,
          requiredPermission: permission,
          heldPermissions: permissions,
          path: req.path,
        },
        'Permission denied',
      );
      return next(new ForbiddenError());
    }
    next();
  };
}

/**
 * Wraps an async route handler to forward errors to Express error middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

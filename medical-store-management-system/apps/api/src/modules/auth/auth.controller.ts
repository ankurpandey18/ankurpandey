import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/auth.js';
import {
  loginUser,
  changePassword,
  forceChangePassword,
  extractPermissions,
  extractPrimaryRole,
  getUserWithPermissions,
} from './auth.service.js';
import {
  LoginSchema,
  ChangePasswordSchema,
  ForceChangePasswordSchema,
  AuditAction,
} from '@medstore/shared';
import { UnauthorizedError } from '../../middleware/errorHandler.js';
import { recordAuditEvent } from '../../utils/audit.js';
import { getClientIp, getUserAgent } from '../../utils/request.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

function safeUserDto(user: NonNullable<Awaited<ReturnType<typeof getUserWithPermissions>>>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    role: extractPrimaryRole(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);
  const user = await loginUser(body.email, body.password, req);

  // Regenerate session after authentication (session fixation prevention)
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

  req.session.userId = user.id;
  req.session.role = extractPrimaryRole(user) ?? '';
  req.session.permissions = extractPermissions(user);
  req.session.mustChangePassword = user.mustChangePassword;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  res.status(200).json({
    success: true,
    data: safeUserDto(user),
    message: user.mustChangePassword
      ? 'Login successful. Please change your temporary password.'
      : 'Login successful',
  });
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.session.userId;

  await recordAuditEvent({
    actorId: userId ?? null,
    action: AuditAction.LOGOUT,
    entityType: 'User',
    entityId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    requestId: req.requestId,
  });

  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Failed to destroy session on logout');
        reject(err);
      } else {
        resolve();
      }
    });
  });

  res.clearCookie('connect.sid');
  res.status(200).json({ success: true, data: null, message: 'Logged out successfully' });
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) {
    throw new UnauthorizedError();
  }

  const user = await getUserWithPermissions(req.session.userId);
  if (!user) {
    throw new UnauthorizedError('Session invalid');
  }

  res.status(200).json({ success: true, data: safeUserDto(user) });
});

/**
 * POST /api/v1/auth/change-password
 */
export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();

  const userId = req.session.userId;
  const body = ChangePasswordSchema.parse(req.body);
  await changePassword(userId, body.currentPassword, body.newPassword, req);

  // Invalidate all active sessions for this user across all devices
  await prisma.$executeRawUnsafe(
    'DELETE FROM "session" WHERE sess->>\'userId\' = $1',
    userId,
  );

  // Invalidate current session and require re-login after password change
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
  res.clearCookie('connect.sid');

  res.status(200).json({
    success: true,
    data: null,
    message: 'Password changed. Please log in again.',
  });
});

/**
 * POST /api/v1/auth/force-change-password
 * Used when mustChangePassword is true (temporary password assigned by owner).
 */
export const forceChangePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();

  const body = ForceChangePasswordSchema.parse(req.body);
  await forceChangePassword(req.session.userId, body.newPassword, req);

  // Update session
  req.session.mustChangePassword = false;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  res.status(200).json({
    success: true,
    data: null,
    message: 'Password updated successfully.',
  });
});

/**
 * GET /api/v1/auth/csrf-token
 * Returns a CSRF token for the client to include in state-changing requests.
 */
export const getCsrfToken = asyncHandler(async (req: Request, res: Response) => {
  // The CSRF token is embedded in the session cookie mechanism
  // We use a double-submit token stored in session
  if (!req.session.csrfToken) {
    const { randomBytes } = await import('crypto');
    req.session.csrfToken = randomBytes(32).toString('hex');
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
  }
  res.status(200).json({ success: true, data: { csrfToken: req.session.csrfToken } });
});

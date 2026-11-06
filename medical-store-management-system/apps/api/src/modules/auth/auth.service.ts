import argon2 from 'argon2';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  AppError,
} from '../../middleware/errorHandler.js';
import { recordAuditEvent, sanitizeForAudit } from '../../utils/audit.js';
import { AuditAction, ROLE_PERMISSIONS, Role } from '@medstore/shared';
import { RoleName } from '@prisma/client';
import { Request } from 'express';
import { getClientIp, getUserAgent } from '../../utils/request.js';

// Argon2id parameters - OWASP recommended
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Returns the user with their role and permissions, or null if not found.
 */
export async function getUserWithPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });
  return user;
}

/**
 * Extracts permissions array from a user with roles/permissions included.
 */
export function extractPermissions(
  user: Awaited<ReturnType<typeof getUserWithPermissions>>,
): string[] {
  if (!user) return [];
  const perms = new Set<string>();
  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) {
      perms.add(rp.permission.key);
    }
  }
  return Array.from(perms);
}

/**
 * Extracts the primary role from a user (first role assigned).
 */
export function extractPrimaryRole(
  user: Awaited<ReturnType<typeof getUserWithPermissions>>,
): string | null {
  if (!user || user.roles.length === 0) return null;
  return user.roles[0]?.role.name ?? null;
}

/**
 * Authenticates a user by email and password.
 * Records login attempts and audit events.
 */
export async function loginUser(
  email: string,
  password: string,
  req: Request,
): Promise<Awaited<ReturnType<typeof getUserWithPermissions>> & object> {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  // Always run password verification to prevent timing attacks
  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummysalt$dummyhashvalue';
  const isValid = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword(dummyHash, 'dummy-password').catch(() => false);

  // Record login attempt
  await prisma.loginAttempt.create({
    data: {
      userId: user?.id ?? null,
      email: email.toLowerCase(),
      ipAddress: ip,
      userAgent: ua,
      success: isValid && user !== null,
    },
  });

  if (!user || !isValid) {
    await recordAuditEvent({
      actorId: user?.id ?? null,
      action: AuditAction.LOGIN_FAILED,
      entityType: 'User',
      entityId: user?.id,
      ipAddress: ip,
      userAgent: ua,
      requestId: req.requestId,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'INACTIVE') {
    await recordAuditEvent({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      userAgent: ua,
      requestId: req.requestId,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  await recordAuditEvent({
    actorId: user.id,
    action: AuditAction.LOGIN_SUCCESS,
    entityType: 'User',
    entityId: user.id,
    ipAddress: ip,
    userAgent: ua,
    requestId: req.requestId,
  });

  logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');
  return user;
}

/**
 * Changes the authenticated user's own password.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  req: Request,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw new AppError(400, 'SAME_PASSWORD', 'New password must differ from the current password');
  }

  const hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, mustChangePassword: false },
  });

  await recordAuditEvent({
    actorId: userId,
    action: AuditAction.PASSWORD_CHANGED,
    entityType: 'User',
    entityId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    requestId: req.requestId,
  });

  logger.info({ userId }, 'Password changed successfully');
}

/**
 * Force-change password on first login (no current password required).
 */
export async function forceChangePassword(
  userId: string,
  newPassword: string,
  req: Request,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  if (!user.mustChangePassword) {
    throw new ForbiddenError('Password change is not required');
  }

  const hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, mustChangePassword: false },
  });

  await recordAuditEvent({
    actorId: userId,
    action: AuditAction.FORCE_PASSWORD_CHANGE,
    entityType: 'User',
    entityId: userId,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    requestId: req.requestId,
  });
}

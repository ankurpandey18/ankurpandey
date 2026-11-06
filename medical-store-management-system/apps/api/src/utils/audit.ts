import { prisma } from '../config/database.js';
import { AuditActionType } from '@medstore/shared';
import { logger } from '../config/logger.js';
import { Prisma } from '@prisma/client';

interface AuditEventInput {
  actorId?: string | null;
  action: AuditActionType | string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  prevState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
}

/**
 * Records an audit event. Never throws — audit failures must not break the primary flow,
 * but are always logged as errors.
 */
export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        action: event.action,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ? event.userAgent.substring(0, 500) : null,
        requestId: event.requestId ?? null,
        prevState: event.prevState != null ? (event.prevState as unknown as Prisma.InputJsonValue) : undefined,
        newState: event.newState != null ? (event.newState as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    logger.error({ err, event: { action: event.action, actorId: event.actorId } }, 'Failed to record audit event');
  }
}

/**
 * Sanitizes user objects for audit log storage.
 * Strips password hashes and other sensitive fields.
 */
export function sanitizeForAudit(obj: Record<string, unknown>): Record<string, unknown> {
  const { passwordHash: _ph, password: _p, ...safe } = obj;
  return safe;
}

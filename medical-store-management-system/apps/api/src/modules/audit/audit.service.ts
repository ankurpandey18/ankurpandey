import { prisma } from '../../config/database.js';
import { recordAuditEvent } from '../../utils/audit.js';
import { AuditListQuery, Paginated } from '@medstore/shared';
import { Prisma } from '@prisma/client';

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  prevState: Prisma.JsonValue;
  newState: Prisma.JsonValue;
  createdAt: string;
}

export async function listAuditLogs(
  query: AuditListQuery,
): Promise<Paginated<AuditLogDto>> {
  const { page, limit, actorId, action, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    AND: [
      actorId ? { actorId } : {},
      action ? { action: { contains: action, mode: 'insensitive' } } : {},
      startDate ? { createdAt: { gte: new Date(startDate) } } : {},
      endDate ? { createdAt: { lte: new Date(endDate) } } : {},
    ],
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: logs.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      actorEmail: log.actor?.email ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      requestId: log.requestId,
      prevState: log.prevState,
      newState: log.newState,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAuditLog(id: string): Promise<AuditLogDto | null> {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { actor: { select: { name: true, email: true } } },
  });
  if (!log) return null;

  return {
    id: log.id,
    actorId: log.actorId,
    actorName: log.actor?.name ?? null,
    actorEmail: log.actor?.email ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    requestId: log.requestId,
    prevState: log.prevState,
    newState: log.newState,
    createdAt: log.createdAt.toISOString(),
  };
}

export const auditService = {
  log: recordAuditEvent,
};

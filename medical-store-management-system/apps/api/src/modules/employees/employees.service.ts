import { prisma } from '../../config/database.js';
import { hashPassword } from '../auth/auth.service.js';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeListQuery,
  AuditAction,
  Role,
  Paginated,
  EmployeeDto,
} from '@medstore/shared';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../../middleware/errorHandler.js';
import { recordAuditEvent, sanitizeForAudit } from '../../utils/audit.js';
import { RoleName, AccountStatus, Prisma } from '@prisma/client';
import { Request } from 'express';
import { getClientIp, getUserAgent } from '../../utils/request.js';
import { randomBytes } from 'crypto';

function toEmployeeDto(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  mustChangePassword: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{ role: { name: RoleName } }>;
  employeeProfile: { employeeCode: string; joiningDate: Date | null } | null;
}): EmployeeDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status as 'ACTIVE' | 'INACTIVE',
    mustChangePassword: user.mustChangePassword,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    role: (user.roles[0]?.role.name ?? 'BILLING_STAFF') as Role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    employeeCode: user.employeeProfile?.employeeCode ?? '',
    joiningDate: user.employeeProfile?.joiningDate?.toISOString() ?? null,
  };
}

const userWithEmployeeInclude = {
  roles: { include: { role: true } },
  employeeProfile: true,
} as const;

export async function listEmployees(
  query: EmployeeListQuery,
): Promise<Paginated<EmployeeDto>> {
  const { page, limit, search, role, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeProfile: { employeeCode: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {},
      role ? { roles: { some: { role: { name: role as RoleName } } } } : {},
      status ? { status: status as AccountStatus } : {},
    ],
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: userWithEmployeeInclude,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(toEmployeeDto),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getEmployee(id: string): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: userWithEmployeeInclude,
  });
  if (!user) throw new NotFoundError('Employee');
  return toEmployeeDto(user);
}

export async function createEmployee(
  input: CreateEmployeeInput,
  actorId: string,
  req: Request,
): Promise<EmployeeDto> {
  // Check for duplicates
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw new ConflictError('An employee with this email already exists');

  if (input.employeeCode) {
    const existingCode = await prisma.employeeProfile.findUnique({
      where: { employeeCode: input.employeeCode },
    });
    if (existingCode) throw new ConflictError('Employee code is already in use');
  }

  const role = await prisma.role.findUnique({ where: { name: input.role as RoleName } });
  if (!role) throw new NotFoundError('Role');

  // Generate a secure temporary password if none provided or blank
  const temporaryPassword =
    input.temporaryPassword && input.temporaryPassword.trim() !== ''
      ? input.temporaryPassword
      : `Med@${randomBytes(6).toString('hex').toUpperCase()}`;
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      status: 'ACTIVE',
      mustChangePassword: true,
      roles: {
        create: {
          roleId: role.id,
          assignedBy: actorId,
        },
      },
      employeeProfile: {
        create: {
          employeeCode: input.employeeCode,
          joiningDate:
            input.joiningDate && input.joiningDate.trim() !== ''
              ? new Date(input.joiningDate)
              : null,
        },
      },
    },
    include: userWithEmployeeInclude,
  });

  await recordAuditEvent({
    actorId,
    action: AuditAction.EMPLOYEE_CREATED,
    entityType: 'User',
    entityId: user.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    requestId: req.requestId,
    newState: sanitizeForAudit({
      name: user.name,
      email: user.email,
      role: input.role,
      employeeCode: input.employeeCode,
    }),
  });

  return toEmployeeDto(user);
}

export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
  actorId: string,
  req: Request,
): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: userWithEmployeeInclude,
  });
  if (!user) throw new NotFoundError('Employee');

  const prevState = sanitizeForAudit({
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.roles[0]?.role.name,
    employeeCode: user.employeeProfile?.employeeCode,
  });

  // Handle role change
  if (input.role && input.role !== user.roles[0]?.role.name) {
    const newRole = await prisma.role.findUnique({ where: { name: input.role as RoleName } });
    if (!newRole) throw new NotFoundError('Role');

    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.userRole.create({
      data: { userId: id, roleId: newRole.id, assignedBy: actorId },
    });

    await recordAuditEvent({
      actorId,
      action: AuditAction.ROLE_ASSIGNED,
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(req),
      requestId: req.requestId,
      prevState: { role: user.roles[0]?.role.name },
      newState: { role: input.role },
    });
  }

  // Handle employee code change
  if (input.employeeCode && input.employeeCode !== user.employeeProfile?.employeeCode) {
    const existingCode = await prisma.employeeProfile.findUnique({
      where: { employeeCode: input.employeeCode },
    });
    if (existingCode && existingCode.userId !== id) {
      throw new ConflictError('Employee code is already in use');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      phone: input.phone !== undefined ? input.phone || null : undefined,
      employeeProfile:
        input.employeeCode !== undefined || input.joiningDate !== undefined
          ? {
              update: {
                employeeCode: input.employeeCode ?? undefined,
                joiningDate:
                  input.joiningDate !== undefined
                    ? input.joiningDate && input.joiningDate.trim() !== ''
                      ? new Date(input.joiningDate)
                      : null
                    : undefined,
              },
            }
          : undefined,
    },
    include: userWithEmployeeInclude,
  });

  await recordAuditEvent({
    actorId,
    action: AuditAction.EMPLOYEE_UPDATED,
    entityType: 'User',
    entityId: id,
    ipAddress: getClientIp(req),
    requestId: req.requestId,
    prevState,
    newState: sanitizeForAudit({
      name: updated.name,
      phone: updated.phone,
      employeeCode: updated.employeeProfile?.employeeCode,
    }),
  });

  return toEmployeeDto(updated);
}

export async function activateEmployee(
  id: string,
  actorId: string,
  req: Request,
): Promise<EmployeeDto> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Employee');

  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' },
    include: userWithEmployeeInclude,
  });

  await recordAuditEvent({
    actorId,
    action: AuditAction.EMPLOYEE_ACTIVATED,
    entityType: 'User',
    entityId: id,
    ipAddress: getClientIp(req),
    requestId: req.requestId,
    prevState: { status: 'INACTIVE' },
    newState: { status: 'ACTIVE' },
  });

  return toEmployeeDto(updated);
}

export async function deactivateEmployee(
  id: string,
  actorId: string,
  req: Request,
): Promise<EmployeeDto> {
  if (id === actorId) {
    throw new ForbiddenError('You cannot deactivate your own account');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: userWithEmployeeInclude,
  });
  if (!user) throw new NotFoundError('Employee');

  // Prevent deactivating the last active owner
  const isOwner = user.roles.some((ur) => ur.role.name === 'OWNER');
  if (isOwner) {
    const activeOwnerCount = await prisma.user.count({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { name: 'OWNER' } } },
      },
    });
    if (activeOwnerCount <= 1) {
      throw new ForbiddenError('Cannot deactivate the last active owner account');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' },
    include: userWithEmployeeInclude,
  });

  // Revoke all active sessions for the deactivated employee immediately
  await prisma.$executeRawUnsafe(
    'DELETE FROM "session" WHERE sess->>\'userId\' = $1',
    id,
  );

  await recordAuditEvent({
    actorId,
    action: AuditAction.EMPLOYEE_DEACTIVATED,
    entityType: 'User',
    entityId: id,
    ipAddress: getClientIp(req),
    requestId: req.requestId,
    prevState: { status: 'ACTIVE' },
    newState: { status: 'INACTIVE' },
  });

  return toEmployeeDto(updated);
}

export async function resetEmployeePassword(
  id: string,
  temporaryPassword: string,
  actorId: string,
  req: Request,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Employee');

  const hash = await hashPassword(temporaryPassword);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hash, mustChangePassword: true },
  });

  // Revoke all active sessions for the employee immediately upon password reset
  await prisma.$executeRawUnsafe(
    'DELETE FROM "session" WHERE sess->>\'userId\' = $1',
    id,
  );

  await recordAuditEvent({
    actorId,
    action: AuditAction.PASSWORD_RESET,
    entityType: 'User',
    entityId: id,
    ipAddress: getClientIp(req),
    requestId: req.requestId,
  });
}

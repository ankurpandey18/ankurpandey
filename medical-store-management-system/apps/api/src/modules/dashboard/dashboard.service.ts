import { prisma } from '../../config/database.js';
import { startOfDay, endOfDay } from '../../utils/date.js';

export async function getOwnerDashboardStats() {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [
    totalEmployees,
    activeEmployees,
    pharmacistCount,
    billingStaffCount,
    successfulLoginsToday,
    failedLoginsToday,
    recentAuditLogs,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({
      where: { roles: { some: { role: { name: 'PHARMACIST' } } } },
    }),
    prisma.user.count({
      where: { roles: { some: { role: { name: 'BILLING_STAFF' } } } },
    }),
    prisma.loginAttempt.count({
      where: { success: true, createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.loginAttempt.count({
      where: { success: false, createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    stats: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      pharmacistCount,
      billingStaffCount,
      ownerCount: totalEmployees - pharmacistCount - billingStaffCount,
      successfulLoginsToday,
      failedLoginsToday,
    },
    recentActivity: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: log.actor?.name ?? 'System',
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getPharmacistDashboardStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      employeeProfile: true,
    },
  });

  const recentActivity = await prisma.auditLog.findMany({
    where: { actorId: userId },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  return {
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          role: user.roles[0]?.role.name ?? 'PHARMACIST',
          employeeCode: user.employeeProfile?.employeeCode ?? null,
          lastLogin: user.lastLogin?.toISOString() ?? null,
        }
      : null,
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getBillingStaffDashboardStats(userId: string) {
  return getPharmacistDashboardStats(userId);
}

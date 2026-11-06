import { prisma } from '../../config/database.js';
import { startOfDay, endOfDay } from '../../utils/date.js';

export async function getOwnerDashboardStats() {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const in30 = new Date(todayStart);
  in30.setDate(in30.getDate() + 30);

  const in60 = new Date(todayStart);
  in60.setDate(in60.getDate() + 60);

  const in90 = new Date(todayStart);
  in90.setDate(in90.getDate() + 90);

  const [
    totalEmployees,
    activeEmployees,
    pharmacistCount,
    billingStaffCount,
    successfulLoginsToday,
    failedLoginsToday,
    recentAuditLogs,
    activeMedicineCount,
    totalActiveBatches,
    stockSumResult,
    expiredBatchCount,
    expiring30DaysCount,
    expiring60DaysCount,
    expiring90DaysCount,
    pendingApprovalsCount,
    recentMovements,
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
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, email: true } } },
    }),
    // Phase 2 Inventory KPIs
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.medicineBatch.count({ where: { status: 'ACTIVE' } }),
    prisma.stockBalance.aggregate({
      _sum: { quantityOnHand: true },
    }),
    prisma.medicineBatch.count({
      where: { status: 'ACTIVE', expiryDate: { lt: todayStart } },
    }),
    prisma.medicineBatch.count({
      where: {
        status: 'ACTIVE',
        expiryDate: { gte: todayStart, lte: in30 },
      },
    }),
    prisma.medicineBatch.count({
      where: {
        status: 'ACTIVE',
        expiryDate: { gt: in30, lte: in60 },
      },
    }),
    prisma.medicineBatch.count({
      where: {
        status: 'ACTIVE',
        expiryDate: { gt: in60, lte: in90 },
      },
    }),
    prisma.stockOperation.count({
      where: { status: 'SUBMITTED' },
    }),
    prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        batch: {
          include: { medicine: { select: { brandName: true } } },
        },
        location: { select: { name: true } },
      },
    }),
  ]);

  // Low stock count calculation
  const allMeds = await prisma.medicine.findMany({
    where: { isActive: true },
    select: {
      minStockLevel: true,
      stockBalances: { select: { quantityOnHand: true } },
    },
  });

  const lowStockCount = allMeds.filter((m) => {
    const total = m.stockBalances.reduce((s, b) => s + Number(b.quantityOnHand), 0);
    return total <= Number(m.minStockLevel);
  }).length;

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
      // Phase 2 Inventory Metrics
      activeMedicineCount,
      totalActiveBatches,
      totalStockQuantity: Number(stockSumResult._sum.quantityOnHand || 0),
      lowStockCount,
      expiredBatchCount,
      expiring30DaysCount,
      expiring60DaysCount,
      expiring90DaysCount,
      pendingApprovalsCount,
    },
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      medicineName: m.batch.medicine.brandName,
      batchNumber: m.batch.batchNumber,
      locationName: m.location.name,
      movementType: m.movementType,
      quantityChange: Number(m.quantityChange),
      quantityAfter: Number(m.quantityAfter),
      createdAt: m.createdAt.toISOString(),
    })),
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const in30 = new Date(todayStart);
  in30.setDate(in30.getDate() + 30);

  const [
    activeMedicineCount,
    expiredBatchCount,
    expiring30DaysCount,
    pendingSubmissionsCount,
    recentMovements,
  ] = await Promise.all([
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.medicineBatch.count({
      where: { status: 'ACTIVE', expiryDate: { lt: todayStart } },
    }),
    prisma.medicineBatch.count({
      where: { status: 'ACTIVE', expiryDate: { gte: todayStart, lte: in30 } },
    }),
    prisma.stockOperation.count({
      where: { requestedById: userId, status: 'SUBMITTED' },
    }),
    prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        batch: {
          include: { medicine: { select: { brandName: true } } },
        },
        location: { select: { name: true } },
      },
    }),
  ]);

  const allMeds = await prisma.medicine.findMany({
    where: { isActive: true },
    select: {
      minStockLevel: true,
      stockBalances: { select: { quantityOnHand: true } },
    },
  });

  const lowStockCount = allMeds.filter((m) => {
    const total = m.stockBalances.reduce((s, b) => s + Number(b.quantityOnHand), 0);
    return total <= Number(m.minStockLevel);
  }).length;

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
    inventory: {
      activeMedicineCount,
      lowStockCount,
      expiredBatchCount,
      expiring30DaysCount,
      pendingSubmissionsCount,
    },
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      medicineName: m.batch.medicine.brandName,
      batchNumber: m.batch.batchNumber,
      locationName: m.location.name,
      movementType: m.movementType,
      quantityChange: Number(m.quantityChange),
      quantityAfter: Number(m.quantityAfter),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function getBillingStaffDashboardStats(userId: string) {
  const base = await getPharmacistDashboardStats(userId);
  const totalStockResult = await prisma.stockBalance.aggregate({
    _sum: { quantityOnHand: true },
  });

  return {
    ...base,
    inventory: {
      ...base.inventory,
      totalStockQuantity: Number(totalStockResult._sum.quantityOnHand || 0),
    },
  };
}

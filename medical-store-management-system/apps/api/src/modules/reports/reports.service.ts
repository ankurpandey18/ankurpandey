import { prisma } from '../../config/database.js';
import { startOfDayKolkata } from '../../utils/date.js';
import type {
  ExpiryReportItemDto,
  LowStockReportItemDto,
  InventoryValuationDto,
} from '@medstore/shared';

export class ReportsService {
  async getExpiryReport(filter?: 'expired' | '30days' | '60days' | '90days' | 'all'): Promise<ExpiryReportItemDto[]> {
    const today = startOfDayKolkata();

    const balances = await prisma.stockBalance.findMany({
      where: {
        quantityOnHand: { gt: 0 },
      },
      include: {
        medicine: { select: { brandName: true, sku: true } },
        batch: true,
        location: { select: { name: true } },
      },
      orderBy: { batch: { expiryDate: 'asc' } },
    });

    const items: ExpiryReportItemDto[] = [];

    for (const b of balances) {
      const expDate = new Date(b.batch.expiryDate);
      const diffMs = expDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90' | 'BEYOND_90';
      if (daysRemaining < 0) {
        status = 'EXPIRED';
      } else if (daysRemaining <= 30) {
        status = 'WITHIN_30';
      } else if (daysRemaining <= 60) {
        status = 'WITHIN_60';
      } else if (daysRemaining <= 90) {
        status = 'WITHIN_90';
      } else {
        status = 'BEYOND_90';
      }

      if (filter === 'expired' && status !== 'EXPIRED') continue;
      if (filter === '30days' && status !== 'WITHIN_30' && status !== 'EXPIRED') continue;
      if (filter === '60days' && status !== 'WITHIN_60' && status !== 'WITHIN_30' && status !== 'EXPIRED') continue;
      if (filter === '90days' && status === 'BEYOND_90') continue;

      const qty = Number(b.quantityOnHand);
      const purchaseCost = Number(b.batch.purchasePrice);
      const totalValue = Number((qty * purchaseCost).toFixed(2));

      items.push({
        batchId: b.batchId,
        batchNumber: b.batch.batchNumber,
        medicineId: b.medicineId,
        medicineName: b.medicine.brandName,
        sku: b.medicine.sku,
        locationName: b.location.name,
        quantityOnHand: qty,
        purchaseCost,
        totalValue,
        manufacturingDate: b.batch.manufacturingDate.toISOString().split('T')[0]!,
        expiryDate: expDate.toISOString().split('T')[0]!,
        daysRemaining,
        status,
      });
    }

    return items;
  }

  async getLowStockReport(params?: { search?: string; categoryId?: number }): Promise<LowStockReportItemDto[]> {
    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params?.search
          ? {
              OR: [
                { brandName: { contains: params.search, mode: 'insensitive' } },
                { genericName: { contains: params.search, mode: 'insensitive' } },
                { sku: { contains: params.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: { select: { name: true } },
        batches: { where: { status: 'ACTIVE' } },
        stockBalances: { select: { quantityOnHand: true } },
      },
      orderBy: { brandName: 'asc' },
    });

    const items: LowStockReportItemDto[] = [];

    for (const med of medicines) {
      const totalStock = med.stockBalances.reduce(
        (sum, b) => sum + Number(b.quantityOnHand),
        0,
      );
      const minStockLevel = Number(med.minStockLevel);

      if (totalStock <= minStockLevel) {
        items.push({
          medicineId: med.id,
          brandName: med.brandName,
          genericName: med.genericName,
          sku: med.sku,
          categoryName: med.category?.name || null,
          minStockLevel,
          totalStock,
          deficitQuantity: Math.max(0, Number((minStockLevel - totalStock).toFixed(2))),
          activeBatchesCount: med.batches.length,
        });
      }
    }

    return items;
  }

  async getInventoryValuation(): Promise<InventoryValuationDto> {
    const balances = await prisma.stockBalance.findMany({
      where: { quantityOnHand: { gt: 0 } },
      include: {
        batch: {
          select: {
            purchasePrice: true,
            mrp: true,
          },
        },
      },
    });

    const [totalMedicines, totalBatches] = await Promise.all([
      prisma.medicine.count({ where: { isActive: true } }),
      prisma.medicineBatch.count({ where: { status: 'ACTIVE' } }),
    ]);

    let totalQuantity = 0;
    let totalPurchaseValue = 0;
    let totalMrpValue = 0;

    for (const b of balances) {
      const qty = Number(b.quantityOnHand);
      totalQuantity += qty;
      totalPurchaseValue += qty * Number(b.batch.purchasePrice);
      totalMrpValue += qty * Number(b.batch.mrp);
    }

    return {
      totalMedicines,
      totalBatches,
      totalQuantity: Number(totalQuantity.toFixed(2)),
      totalPurchaseValue: Number(totalPurchaseValue.toFixed(2)),
      totalMrpValue: Number(totalMrpValue.toFixed(2)),
    };
  }
}

export const reportsService = new ReportsService();

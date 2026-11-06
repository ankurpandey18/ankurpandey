import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { startOfDayKolkata, getTodayKolkataString } from '../../utils/date.js';
import type { FefoPreviewResultDto, FefoAllocationItemDto } from '@medstore/shared';

export class FefoService {
  /**
   * Generates a FEFO batch allocation preview for a medicine and requested quantity.
   * Excludes expired batches and batches with zero available stock.
   */
  async recommendBatches(medicineId: string, requestedQuantity: number): Promise<FefoPreviewResultDto> {
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      select: { brandName: true, isActive: true },
    });
    if (!medicine) throw new NotFoundError('Medicine not found');

    const today = startOfDayKolkata();

    // Fetch active batches with expiryDate >= today and positive stock balance
    const stockBalances = await prisma.stockBalance.findMany({
      where: {
        medicineId,
        quantityOnHand: { gt: 0 },
        batch: {
          status: 'ACTIVE',
          expiryDate: { gte: today },
        },
      },
      include: {
        batch: true,
        location: { select: { name: true } },
      },
      orderBy: [
        { batch: { expiryDate: 'asc' } },
        { batch: { createdAt: 'asc' } },
        { id: 'asc' },
      ],
    });

    let remainingNeeded = requestedQuantity;
    const allocations: FefoAllocationItemDto[] = [];

    for (const sb of stockBalances) {
      if (remainingNeeded <= 0) break;

      const available = Number(sb.quantityOnHand);
      const allocated = Math.min(available, remainingNeeded);
      const remainingBatchStock = Number((available - allocated).toFixed(2));
      remainingNeeded = Number((remainingNeeded - allocated).toFixed(2));

      const expDate = new Date(sb.batch.expiryDate);
      const daysToExpiry = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      allocations.push({
        batchId: sb.batchId,
        batchNumber: sb.batch.batchNumber,
        expiryDate: expDate.toISOString().split('T')[0]!,
        mrp: Number(sb.batch.mrp),
        sellingPrice: Number(sb.batch.sellingPrice),
        availableQuantity: available,
        allocatedQuantity: allocated,
        remainingBatchStock,
        daysToExpiry,
        locationId: sb.locationId,
        locationName: sb.location.name,
      });
    }

    const totalAllocated = Number((requestedQuantity - remainingNeeded).toFixed(2));
    const shortage = Number(Math.max(0, remainingNeeded).toFixed(2));

    return {
      medicineId,
      medicineName: medicine.brandName,
      requestedQuantity,
      totalAllocatedQuantity: totalAllocated,
      shortageQuantity: shortage,
      isFullyAllocated: shortage === 0,
      allocations,
    };
  }

  /**
   * Pure in-memory allocation function for candidate batches following strict FEFO rules:
   * 1. Discard expired batches (expiryDate < today)
   * 2. Discard zero-stock batches (availableQuantity <= 0)
   * 3. Sort ascending by earliest expiryDate, secondary sort by batchNumber
   * 4. Allocate until requestedQuantity is fulfilled or shortage is recorded
   */
  recommendBatchAllocation(
    candidateBatches: {
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      availableQuantity: number;
      mrp?: number;
      sellingPrice?: number;
      locationId?: string;
      locationName?: string;
    }[],
    requestedQuantity: number,
    currentDateStr?: string
  ): {
    fulfilled: boolean;
    allocatedTotal: number;
    shortage: number;
    allocations: {
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      allocatedQuantity: number;
      remainingBatchStock: number;
    }[];
  } {
    const todayStr = currentDateStr || getTodayKolkataString();

    // Filter out expired batches and zero-stock batches
    const eligible = candidateBatches.filter(
      (b) => b.availableQuantity > 0 && b.expiryDate >= todayStr
    );

    // Sort by expiry date ascending, then batchNumber
    eligible.sort((a, b) => {
      const dateCmp = a.expiryDate.localeCompare(b.expiryDate);
      if (dateCmp !== 0) return dateCmp;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

    let remainingNeeded = requestedQuantity;
    const allocations: {
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      allocatedQuantity: number;
      remainingBatchStock: number;
    }[] = [];

    for (const batch of eligible) {
      if (remainingNeeded <= 0) break;
      const allocated = Math.min(batch.availableQuantity, remainingNeeded);
      const remainingBatchStock = Number((batch.availableQuantity - allocated).toFixed(2));
      remainingNeeded = Number((remainingNeeded - allocated).toFixed(2));

      allocations.push({
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        allocatedQuantity: allocated,
        remainingBatchStock,
      });
    }

    const allocatedTotal = Number((requestedQuantity - remainingNeeded).toFixed(2));
    const shortage = Number(Math.max(0, remainingNeeded).toFixed(2));

    return {
      fulfilled: shortage === 0,
      allocatedTotal,
      shortage,
      allocations,
    };
  }
}

export const fefoService = new FefoService();
export const fefoEngine = fefoService;


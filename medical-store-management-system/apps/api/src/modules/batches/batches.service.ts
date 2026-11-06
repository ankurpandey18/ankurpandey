import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { AuditAction } from '@medstore/shared';
import type {
  CreateBatchInput,
  UpdateBatchInput,
  BatchListQuery,
  Paginated,
  BatchDto,
} from '@medstore/shared';
import { Prisma, BatchStatus } from '@prisma/client';

export class BatchesService {
  /**
   * Returns today's start date string in Asia/Kolkata timezone (YYYY-MM-DD).
   */
  getTodayKolkata(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs "YYYY-MM-DD"
  }

  calculateDaysRemaining(expiryDateStr: string): number {
    const todayStr = this.getTodayKolkata();
    const today = new Date(todayStr);
    const expiry = new Date(expiryDateStr);
    const diffMs = expiry.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  async list(query: BatchListQuery): Promise<Paginated<BatchDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineBatchWhereInput = {};

    if (query.medicineId) {
      where.medicineId = query.medicineId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { batchNumber: { contains: s, mode: 'insensitive' } },
        { medicine: { brandName: { contains: s, mode: 'insensitive' } } },
        { medicine: { genericName: { contains: s, mode: 'insensitive' } } },
        { medicine: { sku: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const todayStr = this.getTodayKolkata();
    const todayDate = new Date(todayStr);

    if (query.expiryFilter) {
      if (query.expiryFilter === 'expired') {
        where.expiryDate = { lt: todayDate };
      } else if (query.expiryFilter === '30days') {
        const in30 = new Date(todayDate);
        in30.setDate(in30.getDate() + 30);
        where.expiryDate = { gte: todayDate, lte: in30 };
      } else if (query.expiryFilter === '60days') {
        const in60 = new Date(todayDate);
        in60.setDate(in60.getDate() + 60);
        where.expiryDate = { gte: todayDate, lte: in60 };
      } else if (query.expiryFilter === '90days') {
        const in90 = new Date(todayDate);
        in90.setDate(in90.getDate() + 90);
        where.expiryDate = { gte: todayDate, lte: in90 };
      }
    }

    const [items, total] = await Promise.all([
      prisma.medicineBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ expiryDate: 'asc' }, { batchNumber: 'asc' }],
        include: {
          medicine: {
            select: {
              brandName: true,
              genericName: true,
              sku: true,
            },
          },
          stockBalances: {
            select: {
              quantityOnHand: true,
            },
          },
        },
      }),
      prisma.medicineBatch.count({ where }),
    ]);

    const formatted: BatchDto[] = items.map((b) => {
      const totalStock = b.stockBalances.reduce(
        (sum, s) => sum + Number(s.quantityOnHand),
        0,
      );

      const mDateStr = b.manufacturingDate.toISOString().split('T')[0]!;
      const eDateStr = b.expiryDate.toISOString().split('T')[0]!;
      const daysRemaining = this.calculateDaysRemaining(eDateStr);

      // Status check: if expiry date has passed and status is ACTIVE, display as EXPIRED
      let status = b.status;
      if (daysRemaining < 0 && status === 'ACTIVE') {
        status = 'EXPIRED';
      } else if (totalStock <= 0 && status === 'ACTIVE') {
        status = 'DEPLETED';
      }

      return {
        id: b.id,
        medicineId: b.medicineId,
        medicineName: b.medicine.brandName,
        medicineSku: b.medicine.sku,
        batchNumber: b.batchNumber,
        manufacturingDate: mDateStr,
        expiryDate: eDateStr,
        mrp: Number(b.mrp),
        purchasePrice: Number(b.purchasePrice),
        sellingPrice: Number(b.sellingPrice),
        packConversionFactor: Number(b.packConversionFactor),
        status,
        notes: b.notes,
        totalStock,
        daysRemaining,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      };
    });

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(id: string): Promise<BatchDto> {
    const b = await prisma.medicineBatch.findUnique({
      where: { id },
      include: {
        medicine: {
          select: {
            brandName: true,
            genericName: true,
            sku: true,
          },
        },
        stockBalances: {
          select: {
            quantityOnHand: true,
          },
        },
      },
    });

    if (!b) throw new NotFoundError('Medicine batch not found');

    const totalStock = b.stockBalances.reduce(
      (sum, s) => sum + Number(s.quantityOnHand),
      0,
    );

    const mDateStr = b.manufacturingDate.toISOString().split('T')[0]!;
    const eDateStr = b.expiryDate.toISOString().split('T')[0]!;
    const daysRemaining = this.calculateDaysRemaining(eDateStr);

    let status = b.status;
    if (daysRemaining < 0 && status === 'ACTIVE') {
      status = 'EXPIRED';
    } else if (totalStock <= 0 && status === 'ACTIVE') {
      status = 'DEPLETED';
    }

    return {
      id: b.id,
      medicineId: b.medicineId,
      medicineName: b.medicine.brandName,
      medicineSku: b.medicine.sku,
      batchNumber: b.batchNumber,
      manufacturingDate: mDateStr,
      expiryDate: eDateStr,
      mrp: Number(b.mrp),
      purchasePrice: Number(b.purchasePrice),
      sellingPrice: Number(b.sellingPrice),
      packConversionFactor: Number(b.packConversionFactor),
      status,
      notes: b.notes,
      totalStock,
      daysRemaining,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  async create(
    input: CreateBatchInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    // 1. Validate parent medicine exists and is active
    const medicine = await prisma.medicine.findUnique({
      where: { id: input.medicineId },
    });
    if (!medicine) throw new NotFoundError('Medicine not found');
    if (!medicine.isActive) {
      throw new ValidationError('Cannot create batch for a deactivated medicine');
    }

    // 2. Validate batch uniqueness for this medicine
    const batchNumberClean = input.batchNumber.trim().toUpperCase();
    const existing = await prisma.medicineBatch.findUnique({
      where: {
        medicineId_batchNumber: {
          medicineId: input.medicineId,
          batchNumber: batchNumberClean,
        },
      },
    });
    if (existing) {
      throw new ConflictError(
        `Batch "${batchNumberClean}" already exists for this medicine`,
      );
    }

    // 3. Normalize Date strings to start-of-day Date objects
    const mfgDate = new Date(input.manufacturingDate);
    const expDate = new Date(input.expiryDate);

    if (mfgDate > expDate) {
      throw new ValidationError('Manufacturing date cannot be after expiry date');
    }

    const created = await prisma.medicineBatch.create({
      data: {
        medicineId: input.medicineId,
        batchNumber: batchNumberClean,
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        mrp: input.mrp,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        packConversionFactor: input.packConversionFactor ?? 1.0,
        status: input.status ?? BatchStatus.ACTIVE,
        notes: input.notes?.trim() || null,
        createdById: actorId,
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.BATCH_CREATED,
      entityType: 'MedicineBatch',
      entityId: created.id,
      newState: {
        batchNumber: created.batchNumber,
        medicineId: created.medicineId,
        expiryDate: input.expiryDate,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getById(created.id);
  }

  async update(
    id: string,
    input: UpdateBatchInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    const current = await this.getById(id);

    const updated = await prisma.medicineBatch.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.mrp !== undefined ? { mrp: input.mrp } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.BATCH_UPDATED,
      entityType: 'MedicineBatch',
      entityId: id,
      prevState: { status: current.status, mrp: current.mrp },
      newState: { status: updated.status, mrp: Number(updated.mrp) },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getById(id);
  }
}

export const batchesService = new BatchesService();

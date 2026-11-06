import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { AuditAction } from '@medstore/shared';
import type {
  CreateMedicineInput,
  UpdateMedicineInput,
  MedicineListQuery,
  Paginated,
  MedicineDto,
} from '@medstore/shared';
import { Prisma } from '@prisma/client';

export class MedicinesService {
  async list(query: MedicineListQuery): Promise<Paginated<MedicineDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.manufacturerId) {
      where.manufacturerId = query.manufacturerId;
    }

    if (query.dosageFormId) {
      where.dosageFormId = query.dosageFormId;
    }

    if (query.prescriptionRequired !== undefined) {
      where.prescriptionRequired = query.prescriptionRequired;
    }

    if (query.barcode) {
      where.barcodes = {
        some: {
          barcode: { equals: query.barcode.trim(), mode: 'insensitive' },
          isActive: true,
        },
      };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { brandName: { contains: s, mode: 'insensitive' } },
        { genericName: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { displayName: { contains: s, mode: 'insensitive' } },
        {
          barcodes: {
            some: {
              barcode: { contains: s, mode: 'insensitive' },
              isActive: true,
            },
          },
        },
        {
          compositions: {
            some: {
              composition: {
                name: { contains: s, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { brandName: 'asc' },
        include: {
          category: true,
          manufacturer: true,
          dosageForm: true,
          administrationRoute: true,
          barcodes: { where: { isActive: true } },
          compositions: {
            include: {
              composition: true,
              unit: true,
            },
          },
          stockBalances: {
            select: {
              quantityOnHand: true,
            },
          },
        },
      }),
      prisma.medicine.count({ where }),
    ]);

    const formatted: MedicineDto[] = items.map((m) => {
      const totalStock = m.stockBalances.reduce(
        (sum, b) => sum + Number(b.quantityOnHand),
        0,
      );

      return {
        id: m.id,
        sku: m.sku,
        brandName: m.brandName,
        genericName: m.genericName,
        displayName: m.displayName,
        categoryId: m.categoryId,
        category: m.category
          ? {
              id: m.category.id,
              name: m.category.name,
              code: m.category.code,
              description: m.category.description,
              isActive: m.category.isActive,
              createdAt: m.category.createdAt.toISOString(),
              updatedAt: m.category.updatedAt.toISOString(),
            }
          : null,
        manufacturerId: m.manufacturerId,
        manufacturer: m.manufacturer
          ? {
              id: m.manufacturer.id,
              name: m.manufacturer.name,
              code: m.manufacturer.code,
              contactPerson: m.manufacturer.contactPerson,
              email: m.manufacturer.email,
              phone: m.manufacturer.phone,
              address: m.manufacturer.address,
              isActive: m.manufacturer.isActive,
              createdAt: m.manufacturer.createdAt.toISOString(),
              updatedAt: m.manufacturer.updatedAt.toISOString(),
            }
          : null,
        dosageFormId: m.dosageFormId,
        dosageForm: m.dosageForm
          ? {
              id: m.dosageForm.id,
              name: m.dosageForm.name,
              code: m.dosageForm.code,
              description: m.dosageForm.description,
              isActive: m.dosageForm.isActive,
              createdAt: m.dosageForm.createdAt.toISOString(),
            }
          : null,
        administrationRouteId: m.administrationRouteId,
        administrationRoute: m.administrationRoute
          ? {
              id: m.administrationRoute.id,
              name: m.administrationRoute.name,
              code: m.administrationRoute.code,
              isActive: m.administrationRoute.isActive,
              createdAt: m.administrationRoute.createdAt.toISOString(),
            }
          : null,
        prescriptionRequired: m.prescriptionRequired,
        regulatoryCategory: m.regulatoryCategory,
        hsnCode: m.hsnCode,
        gstRate: Number(m.gstRate),
        baseUnit: m.baseUnit,
        packUnit: m.packUnit,
        unitsPerPack: Number(m.unitsPerPack),
        minStockLevel: Number(m.minStockLevel),
        storageConditions: m.storageConditions,
        sideEffects: m.sideEffects,
        isActive: m.isActive,
        totalStock,
        compositions: m.compositions.map((c) => ({
          id: c.id,
          compositionId: c.compositionId,
          compositionName: c.composition.name,
          strengthValue: c.strengthValue ? Number(c.strengthValue) : null,
          unitSymbol: c.unit ? c.unit.symbol : null,
        })),
        barcodes: m.barcodes.map((b) => ({
          id: b.id,
          barcode: b.barcode,
          packagingType: b.packagingType,
        })),
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
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

  async getById(id: string): Promise<MedicineDto> {
    const m = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        manufacturer: true,
        dosageForm: true,
        administrationRoute: true,
        barcodes: { where: { isActive: true } },
        compositions: {
          include: {
            composition: true,
            unit: true,
          },
        },
        stockBalances: {
          select: {
            quantityOnHand: true,
          },
        },
      },
    });

    if (!m) throw new NotFoundError('Medicine not found');

    const totalStock = m.stockBalances.reduce(
      (sum, b) => sum + Number(b.quantityOnHand),
      0,
    );

    return {
      id: m.id,
      sku: m.sku,
      brandName: m.brandName,
      genericName: m.genericName,
      displayName: m.displayName,
      categoryId: m.categoryId,
      category: m.category
        ? {
            id: m.category.id,
            name: m.category.name,
            code: m.category.code,
            description: m.category.description,
            isActive: m.category.isActive,
            createdAt: m.category.createdAt.toISOString(),
            updatedAt: m.category.updatedAt.toISOString(),
          }
        : null,
      manufacturerId: m.manufacturerId,
      manufacturer: m.manufacturer
        ? {
            id: m.manufacturer.id,
            name: m.manufacturer.name,
            code: m.manufacturer.code,
            contactPerson: m.manufacturer.contactPerson,
            email: m.manufacturer.email,
            phone: m.manufacturer.phone,
            address: m.manufacturer.address,
            isActive: m.manufacturer.isActive,
            createdAt: m.manufacturer.createdAt.toISOString(),
            updatedAt: m.manufacturer.updatedAt.toISOString(),
          }
        : null,
      dosageFormId: m.dosageFormId,
      dosageForm: m.dosageForm
        ? {
            id: m.dosageForm.id,
            name: m.dosageForm.name,
            code: m.dosageForm.code,
            description: m.dosageForm.description,
            isActive: m.dosageForm.isActive,
            createdAt: m.dosageForm.createdAt.toISOString(),
          }
        : null,
      administrationRouteId: m.administrationRouteId,
      administrationRoute: m.administrationRoute
        ? {
            id: m.administrationRoute.id,
            name: m.administrationRoute.name,
            code: m.administrationRoute.code,
            isActive: m.administrationRoute.isActive,
            createdAt: m.administrationRoute.createdAt.toISOString(),
          }
        : null,
      prescriptionRequired: m.prescriptionRequired,
      regulatoryCategory: m.regulatoryCategory,
      hsnCode: m.hsnCode,
      gstRate: Number(m.gstRate),
      baseUnit: m.baseUnit,
      packUnit: m.packUnit,
      unitsPerPack: Number(m.unitsPerPack),
      minStockLevel: Number(m.minStockLevel),
      storageConditions: m.storageConditions,
      sideEffects: m.sideEffects,
      isActive: m.isActive,
      totalStock,
      compositions: m.compositions.map((c) => ({
        id: c.id,
        compositionId: c.compositionId,
        compositionName: c.composition.name,
        strengthValue: c.strengthValue ? Number(c.strengthValue) : null,
        unitSymbol: c.unit ? c.unit.symbol : null,
      })),
      barcodes: m.barcodes.map((b) => ({
        id: b.id,
        barcode: b.barcode,
        packagingType: b.packagingType,
      })),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  async create(
    input: CreateMedicineInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    // 1. Check SKU uniqueness
    const existingSku = await prisma.medicine.findUnique({
      where: { sku: input.sku },
    });
    if (existingSku) {
      throw new ConflictError(`Medicine with SKU "${input.sku}" already exists`);
    }

    // 2. Check Barcode uniqueness if provided
    if (input.primaryBarcode && input.primaryBarcode.trim()) {
      const existingBarcode = await prisma.medicineBarcode.findUnique({
        where: { barcode: input.primaryBarcode.trim() },
      });
      if (existingBarcode) {
        throw new ConflictError(
          `Barcode "${input.primaryBarcode.trim()}" is already assigned to another medicine`,
        );
      }
    }

    const displayName =
      input.displayName?.trim() ||
      `${input.brandName.trim()} (${input.genericName.trim()})`;

    // 3. Create medicine with relations in transaction
    const created = await prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: {
          sku: input.sku.trim().toUpperCase(),
          brandName: input.brandName.trim(),
          genericName: input.genericName.trim(),
          displayName,
          categoryId: input.categoryId || null,
          manufacturerId: input.manufacturerId || null,
          dosageFormId: input.dosageFormId || null,
          administrationRouteId: input.administrationRouteId || null,
          prescriptionRequired: input.prescriptionRequired ?? false,
          regulatoryCategory: input.regulatoryCategory || 'GENERAL',
          hsnCode: input.hsnCode?.trim() || null,
          gstRate: input.gstRate ?? 12.0,
          baseUnit: input.baseUnit.trim().toUpperCase(),
          packUnit: input.packUnit.trim().toUpperCase(),
          unitsPerPack: input.unitsPerPack ?? 10.0,
          minStockLevel: input.minStockLevel ?? 10.0,
          storageConditions: input.storageConditions?.trim() || null,
          sideEffects: input.sideEffects?.trim() || null,
          createdById: actorId,
        },
      });

      // Add barcode if present
      if (input.primaryBarcode && input.primaryBarcode.trim()) {
        await tx.medicineBarcode.create({
          data: {
            barcode: input.primaryBarcode.trim(),
            medicineId: medicine.id,
            packagingType: 'BASE_UNIT',
          },
        });
      }

      // Add compositions if present
      if (input.compositions && input.compositions.length > 0) {
        for (const comp of input.compositions) {
          await tx.medicineComposition.create({
            data: {
              medicineId: medicine.id,
              compositionId: comp.compositionId,
              strengthValue: comp.strengthValue ?? null,
              unitId: comp.unitId ?? null,
            },
          });
        }
      }

      return medicine;
    });

    // 4. Audit Log
    await auditService.log({
      actorId,
      action: AuditAction.MEDICINE_CREATED,
      entityType: 'Medicine',
      entityId: created.id,
      newState: { sku: created.sku, brandName: created.brandName },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getById(created.id);
  }

  async update(
    id: string,
    input: UpdateMedicineInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    const current = await this.getById(id);

    // Check SKU conflict if modified
    if (input.sku && input.sku !== current.sku) {
      const existingSku = await prisma.medicine.findUnique({
        where: { sku: input.sku },
      });
      if (existingSku) {
        throw new ConflictError(`Medicine with SKU "${input.sku}" already exists`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const med = await tx.medicine.update({
        where: { id },
        data: {
          ...(input.sku ? { sku: input.sku.trim().toUpperCase() } : {}),
          ...(input.brandName ? { brandName: input.brandName.trim() } : {}),
          ...(input.genericName ? { genericName: input.genericName.trim() } : {}),
          ...(input.displayName ? { displayName: input.displayName.trim() } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.manufacturerId !== undefined ? { manufacturerId: input.manufacturerId } : {}),
          ...(input.dosageFormId !== undefined ? { dosageFormId: input.dosageFormId } : {}),
          ...(input.administrationRouteId !== undefined
            ? { administrationRouteId: input.administrationRouteId }
            : {}),
          ...(input.prescriptionRequired !== undefined
            ? { prescriptionRequired: input.prescriptionRequired }
            : {}),
          ...(input.regulatoryCategory !== undefined
            ? { regulatoryCategory: input.regulatoryCategory }
            : {}),
          ...(input.hsnCode !== undefined ? { hsnCode: input.hsnCode?.trim() || null } : {}),
          ...(input.gstRate !== undefined ? { gstRate: input.gstRate } : {}),
          ...(input.baseUnit ? { baseUnit: input.baseUnit.trim().toUpperCase() } : {}),
          ...(input.packUnit ? { packUnit: input.packUnit.trim().toUpperCase() } : {}),
          ...(input.unitsPerPack !== undefined ? { unitsPerPack: input.unitsPerPack } : {}),
          ...(input.minStockLevel !== undefined ? { minStockLevel: input.minStockLevel } : {}),
          ...(input.storageConditions !== undefined
            ? { storageConditions: input.storageConditions?.trim() || null }
            : {}),
          ...(input.sideEffects !== undefined
            ? { sideEffects: input.sideEffects?.trim() || null }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      // Update Compositions if explicitly provided
      if (input.compositions) {
        await tx.medicineComposition.deleteMany({ where: { medicineId: id } });
        for (const comp of input.compositions) {
          await tx.medicineComposition.create({
            data: {
              medicineId: id,
              compositionId: comp.compositionId,
              strengthValue: comp.strengthValue ?? null,
              unitId: comp.unitId ?? null,
            },
          });
        }
      }

      // Add barcode if primaryBarcode provided and doesn't exist
      if (input.primaryBarcode && input.primaryBarcode.trim()) {
        const barcodeStr = input.primaryBarcode.trim();
        const existingBarcode = await tx.medicineBarcode.findUnique({
          where: { barcode: barcodeStr },
        });
        if (existingBarcode && existingBarcode.medicineId !== id) {
          throw new ConflictError(`Barcode "${barcodeStr}" is already assigned to another medicine`);
        }
        if (!existingBarcode) {
          await tx.medicineBarcode.create({
            data: {
              barcode: barcodeStr,
              medicineId: id,
              packagingType: 'BASE_UNIT',
            },
          });
        }
      }

      return med;
    });

    // Audit Log
    await auditService.log({
      actorId,
      action: AuditAction.MEDICINE_UPDATED,
      entityType: 'Medicine',
      entityId: id,
      prevState: { sku: current.sku, brandName: current.brandName },
      newState: { sku: updated.sku, brandName: updated.brandName },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getById(id);
  }

  async deactivate(
    id: string,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    const med = await this.getById(id);
    if (!med.isActive) {
      throw new ValidationError('Medicine is already deactivated');
    }

    await prisma.medicine.update({
      where: { id },
      data: { isActive: false },
    });

    await auditService.log({
      actorId,
      action: AuditAction.MEDICINE_DEACTIVATED,
      entityType: 'Medicine',
      entityId: id,
      prevState: { isActive: true },
      newState: { isActive: false },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getById(id);
  }

  async addBarcode(medicineId: string, barcode: string, packagingType: 'BASE_UNIT' | 'PACK' = 'BASE_UNIT') {
    await this.getById(medicineId);
    const cleanBarcode = barcode.trim();
    const existing = await prisma.medicineBarcode.findUnique({
      where: { barcode: cleanBarcode },
    });
    if (existing) {
      throw new ConflictError(`Barcode "${cleanBarcode}" is already assigned`);
    }
    return prisma.medicineBarcode.create({
      data: {
        barcode: cleanBarcode,
        medicineId,
        packagingType,
      },
    });
  }
}

export const medicinesService = new MedicinesService();

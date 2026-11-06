import { prisma } from '../../config/database.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../utils/errors.js';
import { auditService } from '../audit/audit.service.js';
import { AuditAction } from '@medstore/shared';
import type {
  CreateStockLocationInput,
  UpdateStockLocationInput,
  StockLocationDto,
  CreateOpeningStockInput,
  CreateAdjustmentInput,
  CreateTransferInput,
  OperationDecisionInput,
  CreateStockCountSessionInput,
  RecordStockCountItemInput,
  StockLedgerQuery,
  Paginated,
  StockMovementDto,
  StockBalanceDto,
  StockOperationDto,
  StockCountSessionDto,
} from '@medstore/shared';
import {
  Prisma,
  OperationType,
  OperationStatus,
  MovementType,
  BatchStatus,
} from '@prisma/client';

export class InventoryService {
  // ─── Locations ──────────────────────────────────────────────────────────────
  async listLocations(includeInactive = false): Promise<StockLocationDto[]> {
    const locations = await prisma.stockLocation.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { name: true } },
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      type: loc.type,
      description: loc.description,
      parentId: loc.parentId,
      parentName: loc.parent?.name || null,
      isActive: loc.isActive,
      createdAt: loc.createdAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    }));
  }

  async createLocation(input: CreateStockLocationInput): Promise<StockLocationDto> {
    const existing = await prisma.stockLocation.findUnique({
      where: { code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Location with code "${input.code}" already exists`);
    }

    if (input.parentId) {
      const parent = await prisma.stockLocation.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) throw new NotFoundError('Parent location not found');
    }

    const loc = await prisma.stockLocation.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        type: input.type,
        description: input.description?.trim() || null,
        parentId: input.parentId || null,
      },
      include: {
        parent: { select: { name: true } },
      },
    });

    return {
      id: loc.id,
      name: loc.name,
      code: loc.code,
      type: loc.type,
      description: loc.description,
      parentId: loc.parentId,
      parentName: loc.parent?.name || null,
      isActive: loc.isActive,
      createdAt: loc.createdAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    };
  }

  async updateLocation(
    id: string,
    input: UpdateStockLocationInput,
  ): Promise<StockLocationDto> {
    const current = await prisma.stockLocation.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Location not found');

    if (input.code && input.code !== current.code) {
      const existing = await prisma.stockLocation.findUnique({
        where: { code: input.code.trim().toUpperCase() },
      });
      if (existing) {
        throw new ConflictError(`Location with code "${input.code}" already exists`);
      }
    }

    if (input.parentId && input.parentId === id) {
      throw new ValidationError('A location cannot be its own parent');
    }

    const updated = await prisma.stockLocation.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        parent: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      type: updated.type,
      description: updated.description,
      parentId: updated.parentId,
      parentName: updated.parent?.name || null,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ─── Stock Balances ─────────────────────────────────────────────────────────
  async listBalances(params: {
    page?: number;
    limit?: number;
    medicineId?: string;
    batchId?: string;
    locationId?: string;
    search?: string;
    onlyAvailable?: boolean;
  }): Promise<Paginated<StockBalanceDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockBalanceWhereInput = {};

    if (params.medicineId) where.medicineId = params.medicineId;
    if (params.batchId) where.batchId = params.batchId;
    if (params.locationId) where.locationId = params.locationId;
    if (params.onlyAvailable) where.quantityOnHand = { gt: 0 };

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      where.OR = [
        { medicine: { brandName: { contains: s, mode: 'insensitive' } } },
        { medicine: { genericName: { contains: s, mode: 'insensitive' } } },
        { medicine: { sku: { contains: s, mode: 'insensitive' } } },
        { batch: { batchNumber: { contains: s, mode: 'insensitive' } } },
        { location: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.stockBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ medicine: { brandName: 'asc' } }, { batch: { expiryDate: 'asc' } }],
        include: {
          medicine: { select: { brandName: true, sku: true } },
          batch: { select: { batchNumber: true, expiryDate: true, status: true } },
          location: { select: { name: true, code: true } },
        },
      }),
      prisma.stockBalance.count({ where }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatted: StockBalanceDto[] = items.map((sb) => {
      const expDate = new Date(sb.batch.expiryDate);
      const diffDays = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        id: sb.id,
        medicineId: sb.medicineId,
        medicineName: sb.medicine.brandName,
        medicineSku: sb.medicine.sku,
        batchId: sb.batchId,
        batchNumber: sb.batch.batchNumber,
        expiryDate: expDate.toISOString().split('T')[0]!,
        locationId: sb.locationId,
        locationName: sb.location.name,
        locationCode: sb.location.code,
        quantityOnHand: Number(sb.quantityOnHand),
        reorderThreshold: Number(sb.reorderThreshold),
        lastMovementAt: sb.lastMovementAt ? sb.lastMovementAt.toISOString() : null,
        daysRemaining: diffDays,
        batchStatus: sb.batch.status,
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

  // ─── Stock Ledger ───────────────────────────────────────────────────────────
  async listLedger(query: StockLedgerQuery): Promise<Paginated<StockMovementDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};

    if (query.medicineId) where.batch = { medicineId: query.medicineId };
    if (query.batchId) where.batchId = query.batchId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.movementType) where.movementType = query.movementType;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          batch: {
            include: {
              medicine: { select: { brandName: true } },
            },
          },
          location: { select: { name: true } },
          operation: { select: { operationNumber: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const formatted: StockMovementDto[] = items.map((m) => ({
      id: m.id,
      batchId: m.batchId,
      batchNumber: m.batch.batchNumber,
      medicineName: m.batch.medicine.brandName,
      locationId: m.locationId,
      locationName: m.location.name,
      operationId: m.operationId,
      operationNumber: m.operation?.operationNumber || null,
      movementType: m.movementType,
      quantityChange: Number(m.quantityChange),
      quantityBefore: Number(m.quantityBefore),
      quantityAfter: Number(m.quantityAfter),
      referenceDoc: m.referenceDoc,
      reason: m.reason,
      createdByName: m.createdBy?.name || null,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ─── Concurrency-Safe Stock Posting Core ─────────────────────────────────────
  /**
   * Executes atomic stock balance updates with PostgreSQL row-level locking.
   * If stock would become negative, rolls back immediately.
   */
  private async postStockMovementInternal(
    tx: Prisma.TransactionClient,
    params: {
      medicineId: string;
      batchId: string;
      locationId: string;
      operationId?: string;
      movementType: MovementType;
      quantityChange: number; // Signed: positive for in, negative for out
      referenceDoc?: string;
      reason?: string;
      actorId?: string;
    },
  ) {
    const {
      medicineId,
      batchId,
      locationId,
      operationId,
      movementType,
      quantityChange,
      referenceDoc,
      reason,
      actorId,
    } = params;

    // 1. Ensure StockBalance record exists so we can lock its row
    await tx.$executeRaw`
      INSERT INTO stock_balances (id, "medicineId", "batchId", "locationId", "quantityOnHand", "reorderThreshold", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${medicineId}::uuid, ${batchId}::uuid, ${locationId}::uuid, 0.00, 10.00, NOW(), NOW())
      ON CONFLICT ("batchId", "locationId") DO NOTHING
    `;

    // 2. Lock the specific balance row using SELECT ... FOR UPDATE
    const lockedRows = await tx.$queryRaw<{ id: string; quantityOnHand: string }[]>`
      SELECT id, "quantityOnHand"
      FROM stock_balances
      WHERE "batchId" = ${batchId}::uuid AND "locationId" = ${locationId}::uuid
      FOR UPDATE
    `;

    if (!lockedRows || lockedRows.length === 0) {
      throw new NotFoundError('Stock balance record not found for row lock');
    }

    const currentQty = Number(lockedRows[0]!.quantityOnHand);
    const newQty = Number((currentQty + quantityChange).toFixed(2));

    // 3. Strict Concurrency Check: Non-negative stock
    if (newQty < 0) {
      throw new ValidationError(
        `Insufficient stock in location: Current quantity is ${currentQty}, attempted reduction is ${Math.abs(quantityChange)}`,
      );
    }

    // 4. Create Immutable Ledger Entry
    const movement = await tx.stockMovement.create({
      data: {
        batchId,
        locationId,
        operationId: operationId || null,
        movementType,
        quantityChange,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        referenceDoc: referenceDoc || null,
        reason: reason || null,
        createdById: actorId || null,
      },
    });

    // 5. Update Cached Stock Balance
    await tx.stockBalance.update({
      where: {
        batchId_locationId: {
          batchId,
          locationId,
        },
      },
      data: {
        quantityOnHand: newQty,
        lastMovementAt: new Date(),
      },
    });

    return movement;
  }

  // ─── Operation Helpers ───────────────────────────────────────────────────────
  private async generateOperationNumber(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.stockOperation.count();
    const entropy = Math.floor(100 + Math.random() * 900);
    const num = `${String(count + 1).padStart(4, '0')}-${entropy}`;
    return `${prefix}-${year}-${num}`;
  }

  // ─── Opening Stock ──────────────────────────────────────────────────────────
  async createOpeningStock(
    input: CreateOpeningStockInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    if (input.idempotencyKey) {
      const existing = await prisma.stockOperation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return this.getOperationById(existing.id);
      }
    }

    const opNumber = await this.generateOperationNumber('OPN');

    const operation = await prisma.$transaction(async (tx) => {
      const op = await tx.stockOperation.create({
        data: {
          operationNumber: opNumber,
          type: OperationType.OPENING_STOCK,
          status: OperationStatus.DRAFT,
          idempotencyKey: input.idempotencyKey || null,
          requestedById: actorId,
          notes: input.notes?.trim() || null,
        },
      });

      for (const item of input.items) {
        let batchId = item.batchId;

        // If batch not provided, create it inline
        if (!batchId) {
          if (!item.batchNumber || !item.expiryDate || !item.manufacturingDate) {
            throw new ValidationError(
              'Batch number, manufacturing date, and expiry date are required when creating a new batch',
            );
          }

          const existingBatch = await tx.medicineBatch.findUnique({
            where: {
              medicineId_batchNumber: {
                medicineId: item.medicineId,
                batchNumber: item.batchNumber.trim().toUpperCase(),
              },
            },
          });

          if (existingBatch) {
            batchId = existingBatch.id;
          } else {
            const newBatch = await tx.medicineBatch.create({
              data: {
                medicineId: item.medicineId,
                batchNumber: item.batchNumber.trim().toUpperCase(),
                manufacturingDate: new Date(item.manufacturingDate),
                expiryDate: new Date(item.expiryDate),
                mrp: item.mrp ?? 0,
                purchasePrice: item.purchasePrice ?? 0,
                sellingPrice: item.sellingPrice ?? 0,
                status: BatchStatus.ACTIVE,
                createdById: actorId,
              },
            });
            batchId = newBatch.id;
          }
        }

        const destLoc =
          item.destinationLocationId ||
          input.locationId ||
          (await tx.stockLocation.findFirst({ where: { type: 'MAIN_STORE' } }))?.id;

        if (!destLoc) {
          throw new ValidationError('A valid storage location is required');
        }

        await tx.stockOperationItem.create({
          data: {
            operationId: op.id,
            medicineId: item.medicineId,
            batchId,
            destinationLocationId: destLoc,
            quantity: item.quantity,
            unitPrice: item.purchasePrice ?? item.unitPrice ?? 0,
            reason: item.reason || 'Opening stock initialization',
            notes: item.notes || null,
          },
        });
      }

      return op;
    });

    await auditService.log({
      actorId,
      action: AuditAction.OPENING_STOCK_SUBMITTED,
      entityType: 'StockOperation',
      entityId: operation.id,
      newState: { operationNumber: operation.operationNumber },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getOperationById(operation.id);
  }

  async submitOpeningStock(id: string, actorId?: string) {
    const op = await prisma.stockOperation.findUnique({ where: { id } });
    if (!op) throw new NotFoundError('Operation not found');
    if (op.status !== OperationStatus.DRAFT) {
      throw new ValidationError(`Operation is already in ${op.status} status`);
    }

    const updated = await prisma.stockOperation.update({
      where: { id },
      data: {
        status: OperationStatus.SUBMITTED,
        submittedAt: new Date(),
        requestedById: actorId || op.requestedById,
      },
    });

    return this.getOperationById(updated.id);
  }

  async approveOpeningStock(id: string, actorId?: string) {
    const op = await prisma.stockOperation.findUnique({ where: { id } });
    if (!op) throw new NotFoundError('Operation not found');
    if (op.status !== OperationStatus.SUBMITTED && op.status !== OperationStatus.DRAFT) {
      throw new ValidationError(`Cannot approve operation with status ${op.status}`);
    }

    const updated = await prisma.stockOperation.update({
      where: { id },
      data: {
        status: OperationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: actorId,
      },
    });

    return this.getOperationById(updated.id);
  }

  async postOpeningStock(id: string, actorId?: string) {
    const op = await prisma.stockOperation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!op) throw new NotFoundError('Operation not found');
    if (op.status === OperationStatus.POSTED) {
      throw new ConflictError('This opening stock operation is already posted');
    }
    if (op.status !== OperationStatus.APPROVED) {
      throw new ValidationError('Operation must be APPROVED before posting');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of op.items) {
        if (!item.destinationLocationId) {
          throw new ValidationError('Destination location missing for opening stock item');
        }

        await this.postStockMovementInternal(tx, {
          medicineId: item.medicineId,
          batchId: item.batchId,
          locationId: item.destinationLocationId,
          operationId: op.id,
          movementType: MovementType.OPENING_STOCK,
          quantityChange: Number(item.quantity),
          referenceDoc: op.operationNumber,
          reason: item.reason || 'Opening stock initialization',
          actorId,
        });
      }

      await tx.stockOperation.update({
        where: { id },
        data: {
          status: OperationStatus.POSTED,
          postedAt: new Date(),
        },
      });
    });

    await auditService.log({
      actorId,
      action: AuditAction.OPENING_STOCK_POSTED,
      entityType: 'StockOperation',
      entityId: id,
      newState: { status: OperationStatus.POSTED },
    });

    return this.getOperationById(id);
  }

  // ─── Stock Adjustments ──────────────────────────────────────────────────────
  async createAdjustment(
    input: CreateAdjustmentInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    if (input.idempotencyKey) {
      const existing = await prisma.stockOperation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getOperationById(existing.id);
    }

    const batch = await prisma.medicineBatch.findUnique({
      where: { id: input.batchId },
    });
    if (!batch) throw new NotFoundError('Batch not found');

    const location = await prisma.stockLocation.findUnique({
      where: { id: input.locationId },
    });
    if (!location || !location.isActive) {
      throw new ValidationError('Location is invalid or inactive');
    }

    const opNumber = await this.generateOperationNumber('ADJ');

    const op = await prisma.$transaction(async (tx) => {
      const operation = await tx.stockOperation.create({
        data: {
          operationNumber: opNumber,
          type: OperationType.ADJUSTMENT,
          status: OperationStatus.SUBMITTED, // Directly submitted for approval
          idempotencyKey: input.idempotencyKey || null,
          requestedById: actorId,
          submittedAt: new Date(),
          notes: input.notes?.trim() || null,
        },
      });

      await tx.stockOperationItem.create({
        data: {
          operationId: operation.id,
          medicineId: batch.medicineId,
          batchId: input.batchId,
          sourceLocationId:
            input.adjustmentType !== 'INCREASE' ? input.locationId : null,
          destinationLocationId:
            input.adjustmentType === 'INCREASE' ? input.locationId : null,
          quantity: input.quantity,
          reason: `${input.adjustmentType}: ${input.reason}`,
          notes: input.notes || null,
        },
      });

      return operation;
    });

    await auditService.log({
      actorId,
      action: AuditAction.ADJUSTMENT_SUBMITTED,
      entityType: 'StockOperation',
      entityId: op.id,
      newState: {
        operationNumber: op.operationNumber,
        adjustmentType: input.adjustmentType,
        quantity: input.quantity,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getOperationById(op.id);
  }

  async decideAdjustment(
    id: string,
    decision: OperationDecisionInput,
    actorId?: string,
  ) {
    const op = await prisma.stockOperation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!op) throw new NotFoundError('Adjustment operation not found');
    if (op.status !== OperationStatus.SUBMITTED) {
      throw new ValidationError(`Cannot decide on operation with status ${op.status}`);
    }

    // Role Rule: A pharmacist cannot approve their own adjustment
    if (decision.action === 'APPROVE' && op.requestedById && op.requestedById === actorId) {
      // Check user role: if not OWNER, forbid self-approval
      const user = await prisma.user.findUnique({
        where: { id: actorId },
        include: { roles: { include: { role: true } } },
      });
      const isOwner = user?.roles.some((r) => r.role.name === 'OWNER');
      if (!isOwner) {
        throw new ForbiddenError('Staff members cannot approve their own submitted stock adjustments');
      }
    }

    if (decision.action === 'REJECT') {
      const rejected = await prisma.stockOperation.update({
        where: { id },
        data: {
          status: OperationStatus.REJECTED,
          rejectionReason: decision.reason?.trim() || 'Adjustment rejected by reviewer',
          approvedById: actorId,
        },
      });

      await auditService.log({
        actorId,
        action: AuditAction.ADJUSTMENT_REJECTED,
        entityType: 'StockOperation',
        entityId: id,
        newState: { status: OperationStatus.REJECTED, reason: decision.reason },
      });

      return this.getOperationById(rejected.id);
    }

    // Approved:
    const approved = await prisma.stockOperation.update({
      where: { id },
      data: {
        status: OperationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: actorId,
      },
    });

    await auditService.log({
      actorId,
      action: AuditAction.ADJUSTMENT_APPROVED,
      entityType: 'StockOperation',
      entityId: id,
      newState: { status: OperationStatus.APPROVED },
    });

    return this.getOperationById(approved.id);
  }

  async postAdjustment(id: string, actorId?: string) {
    const op = await prisma.stockOperation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!op) throw new NotFoundError('Adjustment operation not found');
    if (op.status === OperationStatus.POSTED) {
      throw new ConflictError('Adjustment is already posted');
    }
    if (op.status !== OperationStatus.APPROVED) {
      throw new ValidationError('Adjustment must be approved before posting');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of op.items) {
        const isIncrease = !item.sourceLocationId && !!item.destinationLocationId;
        const locationId = isIncrease
          ? item.destinationLocationId!
          : item.sourceLocationId!;

        let movementType: MovementType = MovementType.ADJUSTMENT_IN;
        let signedQty = Number(item.quantity);

        if (!isIncrease) {
          signedQty = -Math.abs(Number(item.quantity));
          if (item.reason?.includes('DAMAGE')) {
            movementType = MovementType.DAMAGE;
          } else if (item.reason?.includes('EXPIRED')) {
            movementType = MovementType.EXPIRED;
          } else {
            movementType = MovementType.ADJUSTMENT_OUT;
          }
        }

        await this.postStockMovementInternal(tx, {
          medicineId: item.medicineId,
          batchId: item.batchId,
          locationId,
          operationId: op.id,
          movementType,
          quantityChange: signedQty,
          referenceDoc: op.operationNumber,
          reason: item.reason || 'Stock adjustment',
          actorId,
        });
      }

      await tx.stockOperation.update({
        where: { id },
        data: {
          status: OperationStatus.POSTED,
          postedAt: new Date(),
        },
      });
    });

    await auditService.log({
      actorId,
      action: AuditAction.ADJUSTMENT_POSTED,
      entityType: 'StockOperation',
      entityId: id,
      newState: { status: OperationStatus.POSTED },
    });

    return this.getOperationById(id);
  }

  // ─── Stock Transfers ────────────────────────────────────────────────────────
  async createAndPostTransfer(
    input: CreateTransferInput,
    actorId?: string,
    reqMeta?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new ValidationError('Source and destination locations must be different');
    }

    if (input.idempotencyKey) {
      const existing = await prisma.stockOperation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getOperationById(existing.id);
    }

    const batch = await prisma.medicineBatch.findUnique({
      where: { id: input.batchId },
    });
    if (!batch) throw new NotFoundError('Batch not found');

    const [srcLoc, destLoc] = await Promise.all([
      prisma.stockLocation.findUnique({ where: { id: input.sourceLocationId } }),
      prisma.stockLocation.findUnique({ where: { id: input.destinationLocationId } }),
    ]);

    if (!srcLoc || !srcLoc.isActive) throw new ValidationError('Source location is invalid or inactive');
    if (!destLoc || !destLoc.isActive) throw new ValidationError('Destination location is invalid or inactive');

    const opNumber = await this.generateOperationNumber('TRF');

    const op = await prisma.$transaction(async (tx) => {
      const operation = await tx.stockOperation.create({
        data: {
          operationNumber: opNumber,
          type: OperationType.TRANSFER,
          status: OperationStatus.POSTED, // Transfers are atomically executed upon creation
          idempotencyKey: input.idempotencyKey || null,
          requestedById: actorId,
          approvedById: actorId,
          submittedAt: new Date(),
          approvedAt: new Date(),
          postedAt: new Date(),
          notes: input.notes?.trim() || null,
        },
      });

      await tx.stockOperationItem.create({
        data: {
          operationId: operation.id,
          medicineId: batch.medicineId,
          batchId: input.batchId,
          sourceLocationId: input.sourceLocationId,
          destinationLocationId: input.destinationLocationId,
          quantity: input.quantity,
          reason: input.reason || 'Inter-location transfer',
          notes: input.notes || null,
        },
      });

      // 1. TRANSFER_OUT from source location
      await this.postStockMovementInternal(tx, {
        medicineId: batch.medicineId,
        batchId: input.batchId,
        locationId: input.sourceLocationId,
        operationId: operation.id,
        movementType: MovementType.TRANSFER_OUT,
        quantityChange: -Math.abs(Number(input.quantity)),
        referenceDoc: operation.operationNumber,
        reason: `Transfer to ${destLoc.name}: ${input.reason || ''}`,
        actorId,
      });

      // 2. TRANSFER_IN to destination location
      await this.postStockMovementInternal(tx, {
        medicineId: batch.medicineId,
        batchId: input.batchId,
        locationId: input.destinationLocationId,
        operationId: operation.id,
        movementType: MovementType.TRANSFER_IN,
        quantityChange: Math.abs(Number(input.quantity)),
        referenceDoc: operation.operationNumber,
        reason: `Transfer from ${srcLoc.name}: ${input.reason || ''}`,
        actorId,
      });

      return operation;
    });

    await auditService.log({
      actorId,
      action: AuditAction.TRANSFER_POSTED,
      entityType: 'StockOperation',
      entityId: op.id,
      newState: {
        operationNumber: op.operationNumber,
        source: srcLoc.name,
        dest: destLoc.name,
        quantity: input.quantity,
      },
      ipAddress: reqMeta?.ip,
      userAgent: reqMeta?.userAgent,
      requestId: reqMeta?.requestId,
    });

    return this.getOperationById(op.id);
  }

  // ─── Stock Counts / Physical Auditing ───────────────────────────────────────
  async createStockCountSession(input: CreateStockCountSessionInput, actorId?: string) {
    const location = await prisma.stockLocation.findUnique({
      where: { id: input.locationId },
    });
    if (!location || !location.isActive) {
      throw new ValidationError('Location is invalid or inactive');
    }

    const count = await prisma.stockCountSession.count();
    const entropy = Math.floor(100 + Math.random() * 900);
    const sessionNumber = `CNT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${entropy}`;

    // Pre-populate items from current stock balances in that location
    const balances = await prisma.stockBalance.findMany({
      where: { locationId: input.locationId },
      include: {
        medicine: true,
        batch: true,
      },
    });

    const session = await prisma.stockCountSession.create({
      data: {
        sessionNumber,
        locationId: input.locationId,
        status: OperationStatus.DRAFT,
        createdById: actorId,
        notes: input.notes?.trim() || null,
        items: {
          create: balances.map((b) => ({
            medicineId: b.medicineId,
            batchId: b.batchId,
            systemQuantity: b.quantityOnHand,
            countedQuantity: b.quantityOnHand, // Default to system until updated
            varianceQuantity: 0.0,
          })),
        },
      },
    });

    return this.getStockCountSessionById(session.id);
  }

  async recordStockCountItems(sessionId: string, input: RecordStockCountItemInput) {
    const session = await prisma.stockCountSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundError('Stock count session not found');
    if (session.status !== OperationStatus.DRAFT && session.status !== OperationStatus.SUBMITTED) {
      throw new ValidationError(`Cannot update counts for session in ${session.status} status`);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        // Find existing or create
        const existing = await tx.stockCountItem.findFirst({
          where: { sessionId, batchId: item.batchId },
        });

        if (existing) {
          const variance = Number(item.countedQuantity) - Number(existing.systemQuantity);
          await tx.stockCountItem.update({
            where: { id: existing.id },
            data: {
              countedQuantity: item.countedQuantity,
              varianceQuantity: variance,
              notes: item.notes?.trim() || null,
            },
          });
        } else {
          // If a new batch was physically found that was not in system balance
          const balance = await tx.stockBalance.findUnique({
            where: {
              batchId_locationId: {
                batchId: item.batchId,
                locationId: session.locationId,
              },
            },
          });
          const sysQty = balance ? Number(balance.quantityOnHand) : 0;
          const variance = Number(item.countedQuantity) - sysQty;

          await tx.stockCountItem.create({
            data: {
              sessionId,
              medicineId: item.medicineId,
              batchId: item.batchId,
              systemQuantity: sysQty,
              countedQuantity: item.countedQuantity,
              varianceQuantity: variance,
              notes: item.notes?.trim() || null,
            },
          });
        }
      }
    });

    return this.getStockCountSessionById(sessionId);
  }

  async submitStockCountSession(id: string, actorId?: string) {
    const session = await prisma.stockCountSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError('Stock count session not found');

    const updated = await prisma.stockCountSession.update({
      where: { id },
      data: {
        status: OperationStatus.SUBMITTED,
        submittedAt: new Date(),
        createdById: actorId || session.createdById,
      },
    });

    return this.getStockCountSessionById(updated.id);
  }

  async decideStockCountSession(
    id: string,
    decision: OperationDecisionInput,
    actorId?: string,
  ) {
    const session = await prisma.stockCountSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundError('Stock count session not found');
    if (session.status !== OperationStatus.SUBMITTED) {
      throw new ValidationError('Session must be submitted before decision');
    }

    if (decision.action === 'REJECT') {
      const updated = await prisma.stockCountSession.update({
        where: { id },
        data: {
          status: OperationStatus.REJECTED,
          rejectionReason: decision.reason || 'Rejected by owner',
          approvedById: actorId,
        },
      });
      return this.getStockCountSessionById(updated.id);
    }

    const updated = await prisma.stockCountSession.update({
      where: { id },
      data: {
        status: OperationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: actorId,
      },
    });

    return this.getStockCountSessionById(updated.id);
  }

  async postStockCountSession(id: string, actorId?: string) {
    const session = await prisma.stockCountSession.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!session) throw new NotFoundError('Stock count session not found');
    if (session.status === OperationStatus.POSTED) {
      throw new ConflictError('Session already posted');
    }
    if (session.status !== OperationStatus.APPROVED) {
      throw new ValidationError('Session must be approved before posting');
    }

    // Post variance movements
    await prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        const variance = Number(item.varianceQuantity);
        if (variance !== 0) {
          await this.postStockMovementInternal(tx, {
            medicineId: item.medicineId,
            batchId: item.batchId,
            locationId: session.locationId,
            movementType: MovementType.STOCK_COUNT_VARIANCE,
            quantityChange: variance,
            referenceDoc: session.sessionNumber,
            reason: `Stock Count Audit: counted ${item.countedQuantity}, system had ${item.systemQuantity}`,
            actorId,
          });
        }
      }

      await tx.stockCountSession.update({
        where: { id },
        data: {
          status: OperationStatus.POSTED,
          postedAt: new Date(),
        },
      });
    });

    await auditService.log({
      actorId,
      action: AuditAction.STOCK_COUNT_POSTED,
      entityType: 'StockCountSession',
      entityId: id,
      newState: { status: OperationStatus.POSTED },
    });

    return this.getStockCountSessionById(id);
  }

  // ─── Query Operations ───────────────────────────────────────────────────────
  async listOperations(params: {
    type?: OperationType;
    status?: OperationStatus;
    page?: number;
    limit?: number;
  }): Promise<Paginated<StockOperationDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockOperationWhereInput = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      prisma.stockOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
          items: {
            include: {
              medicine: { select: { brandName: true } },
              batch: { select: { batchNumber: true } },
              sourceLocation: { select: { name: true } },
              destLocation: { select: { name: true } },
            },
          },
        },
      }),
      prisma.stockOperation.count({ where }),
    ]);

    const formatted: StockOperationDto[] = items.map((op) => ({
      id: op.id,
      operationNumber: op.operationNumber,
      type: op.type,
      status: op.status,
      requestedById: op.requestedById,
      requestedByName: op.requestedBy?.name || null,
      approvedById: op.approvedById,
      approvedByName: op.approvedBy?.name || null,
      notes: op.notes,
      rejectionReason: op.rejectionReason,
      submittedAt: op.submittedAt?.toISOString() || null,
      approvedAt: op.approvedAt?.toISOString() || null,
      postedAt: op.postedAt?.toISOString() || null,
      createdAt: op.createdAt.toISOString(),
      items: op.items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicine.brandName,
        batchId: it.batchId,
        batchNumber: it.batch.batchNumber,
        sourceLocationId: it.sourceLocationId,
        sourceLocationName: it.sourceLocation?.name || null,
        destinationLocationId: it.destinationLocationId,
        destinationLocationName: it.destLocation?.name || null,
        quantity: Number(it.quantity),
        unitPrice: it.unitPrice ? Number(it.unitPrice) : null,
        reason: it.reason,
      })),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getOperationById(id: string): Promise<StockOperationDto> {
    const op = await prisma.stockOperation.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: {
          include: {
            medicine: { select: { brandName: true } },
            batch: { select: { batchNumber: true } },
            sourceLocation: { select: { name: true } },
            destLocation: { select: { name: true } },
          },
        },
      },
    });

    if (!op) throw new NotFoundError('Stock operation not found');

    return {
      id: op.id,
      operationNumber: op.operationNumber,
      type: op.type,
      status: op.status,
      requestedById: op.requestedById,
      requestedByName: op.requestedBy?.name || null,
      approvedById: op.approvedById,
      approvedByName: op.approvedBy?.name || null,
      notes: op.notes,
      rejectionReason: op.rejectionReason,
      submittedAt: op.submittedAt?.toISOString() || null,
      approvedAt: op.approvedAt?.toISOString() || null,
      postedAt: op.postedAt?.toISOString() || null,
      createdAt: op.createdAt.toISOString(),
      items: op.items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicine.brandName,
        batchId: it.batchId,
        batchNumber: it.batch.batchNumber,
        sourceLocationId: it.sourceLocationId,
        sourceLocationName: it.sourceLocation?.name || null,
        destinationLocationId: it.destinationLocationId,
        destinationLocationName: it.destLocation?.name || null,
        quantity: Number(it.quantity),
        unitPrice: it.unitPrice ? Number(it.unitPrice) : null,
        reason: it.reason,
      })),
    };
  }

  async getStockCountSessionById(id: string): Promise<StockCountSessionDto> {
    const s = await prisma.stockCountSession.findUnique({
      where: { id },
      include: {
        location: { select: { name: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: {
          include: {
            medicine: { select: { brandName: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
          },
        },
      },
    });

    if (!s) throw new NotFoundError('Stock count session not found');

    return {
      id: s.id,
      sessionNumber: s.sessionNumber,
      locationId: s.locationId,
      locationName: s.location.name,
      status: s.status,
      createdByName: s.createdBy?.name || null,
      approvedByName: s.approvedBy?.name || null,
      notes: s.notes,
      rejectionReason: s.rejectionReason,
      submittedAt: s.submittedAt?.toISOString() || null,
      approvedAt: s.approvedAt?.toISOString() || null,
      postedAt: s.postedAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      items: s.items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicine.brandName,
        batchId: it.batchId,
        batchNumber: it.batch.batchNumber,
        expiryDate: it.batch.expiryDate.toISOString().split('T')[0]!,
        systemQuantity: Number(it.systemQuantity),
        countedQuantity: Number(it.countedQuantity),
        varianceQuantity: Number(it.varianceQuantity),
        notes: it.notes,
      })),
    };
  }

  async listStockCountSessions(params: {
    locationId?: string;
    status?: OperationStatus;
    page?: number;
    limit?: number;
  }): Promise<Paginated<StockCountSessionDto>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockCountSessionWhereInput = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      prisma.stockCountSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { name: true } },
          createdBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
          items: {
            include: {
              medicine: { select: { brandName: true } },
              batch: { select: { batchNumber: true, expiryDate: true } },
            },
          },
        },
      }),
      prisma.stockCountSession.count({ where }),
    ]);

    const formatted: StockCountSessionDto[] = items.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      locationId: s.locationId,
      locationName: s.location.name,
      status: s.status,
      createdByName: s.createdBy?.name || null,
      approvedByName: s.approvedBy?.name || null,
      notes: s.notes,
      rejectionReason: s.rejectionReason,
      submittedAt: s.submittedAt?.toISOString() || null,
      approvedAt: s.approvedAt?.toISOString() || null,
      postedAt: s.postedAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      items: s.items.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        medicineName: it.medicine.brandName,
        batchId: it.batchId,
        batchNumber: it.batch.batchNumber,
        expiryDate: it.batch.expiryDate.toISOString().split('T')[0]!,
        systemQuantity: Number(it.systemQuantity),
        countedQuantity: Number(it.countedQuantity),
        varianceQuantity: Number(it.varianceQuantity),
        notes: it.notes,
      })),
    }));

    return {
      items: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ─── Reconciliation Service ─────────────────────────────────────────────────
  async reconcileStock() {
    // Computes sum of stock_movements vs stock_balances.quantityOnHand
    const balances = await prisma.stockBalance.findMany({
      include: {
        medicine: { select: { brandName: true, sku: true } },
        batch: { select: { batchNumber: true } },
        location: { select: { name: true } },
      },
    });

    const report: {
      batchId: string;
      batchNumber: string;
      medicineName: string;
      locationName: string;
      cachedQuantity: number;
      ledgerQuantity: number;
      isConsistent: boolean;
      discrepancy: number;
    }[] = [];

    for (const b of balances) {
      const ledgerSumResult = await prisma.stockMovement.aggregate({
        where: {
          batchId: b.batchId,
          locationId: b.locationId,
        },
        _sum: {
          quantityChange: true,
        },
      });

      const ledgerQty = Number(ledgerSumResult._sum.quantityChange || 0);
      const cachedQty = Number(b.quantityOnHand);
      const discrepancy = Number((cachedQty - ledgerQty).toFixed(2));

      report.push({
        batchId: b.batchId,
        batchNumber: b.batch.batchNumber,
        medicineName: b.medicine.brandName,
        locationName: b.location.name,
        cachedQuantity: cachedQty,
        ledgerQuantity: ledgerQty,
        isConsistent: Math.abs(discrepancy) < 0.001,
        discrepancy,
      });
    }

    const totalDiscrepancies = report.filter((r) => !r.isConsistent).length;

    return {
      totalAudited: report.length,
      consistentCount: report.length - totalDiscrepancies,
      discrepancyCount: totalDiscrepancies,
      items: report,
    };
  }
}

export const inventoryService = new InventoryService();

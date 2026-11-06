import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service.js';
import {
  CreateStockLocationSchema,
  UpdateStockLocationSchema,
  CreateOpeningStockSchema,
  CreateAdjustmentSchema,
  CreateTransferSchema,
  OperationDecisionSchema,
  CreateStockCountSessionSchema,
  RecordStockCountItemSchema,
  StockLedgerQuerySchema,
  OperationTypeEnum,
  OperationStatusEnum,
} from '@medstore/shared';

// ─── Locations ────────────────────────────────────────────────────────────────
export async function listLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query['includeInactive'] === 'true';
    const locations = await inventoryService.listLocations(includeInactive);
    res.json({ success: true, data: locations });
  } catch (err) {
    next(err);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateStockLocationSchema.parse(req.body);
    const location = await inventoryService.createLocation(input);
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateStockLocationSchema.parse(req.body);
    const location = await inventoryService.updateLocation(req.params['id'] as string, input);
    res.json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
}

// ─── Balances ─────────────────────────────────────────────────────────────────
export async function listBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const page = req.query['page'] ? Number(req.query['page']) : 1;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
    const medicineId = req.query['medicineId'] as string | undefined;
    const batchId = req.query['batchId'] as string | undefined;
    const locationId = req.query['locationId'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const onlyAvailable = req.query['onlyAvailable'] === 'true';

    const result = await inventoryService.listBalances({
      page,
      limit,
      medicineId,
      batchId,
      locationId,
      search,
      onlyAvailable,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export async function listLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const query = StockLedgerQuerySchema.parse(req.query);
    const result = await inventoryService.listLedger(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Opening Stock ────────────────────────────────────────────────────────────
export async function createOpeningStock(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateOpeningStockSchema.parse(req.body);
    const result = await inventoryService.createOpeningStock(input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitOpeningStock(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.submitOpeningStock(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function approveOpeningStock(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.approveOpeningStock(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function postOpeningStock(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.postOpeningStock(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Adjustments ──────────────────────────────────────────────────────────────
export async function listAdjustments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const status = req.query['status'] as any;
    const result = await inventoryService.listOperations({
      page,
      limit,
      type: 'ADJUSTMENT' as any,
      status,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateAdjustmentSchema.parse(req.body);
    const result = await inventoryService.createAdjustment(input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function decideAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = OperationDecisionSchema.parse(req.body);
    const result = await inventoryService.decideAdjustment(req.params['id'] as string, input, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function approveAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const result = await inventoryService.decideAdjustment(
      req.params['id'] as string,
      { action: 'APPROVE', reason },
      req.session?.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function rejectAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const result = await inventoryService.decideAdjustment(
      req.params['id'] as string,
      { action: 'REJECT', reason },
      req.session?.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function postAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.postAdjustment(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Transfers ────────────────────────────────────────────────────────────────
export async function listTransfers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query['page']) || 1;
    const limit = Number(req.query['limit']) || 20;
    const result = await inventoryService.listOperations({
      page,
      limit,
      type: 'TRANSFER' as any,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateTransferSchema.parse(req.body);
    const result = await inventoryService.createAndPostTransfer(input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Stock Counts ─────────────────────────────────────────────────────────────
export async function createStockCountSession(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateStockCountSessionSchema.parse(req.body);
    const result = await inventoryService.createStockCountSession(input, req.session?.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function recordStockCountItems(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RecordStockCountItemSchema.parse(req.body);
    const result = await inventoryService.recordStockCountItems(req.params['id'] as string, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitStockCountSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.submitStockCountSession(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function decideStockCountSession(req: Request, res: Response, next: NextFunction) {
  try {
    const input = OperationDecisionSchema.parse(req.body);
    const result = await inventoryService.decideStockCountSession(req.params['id'] as string, input, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function postStockCountSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.postStockCountSession(req.params['id'] as string, req.session?.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listStockCountSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const locationId = req.query['locationId'] as string | undefined;
    const status = req.query['status'] as any;
    const page = req.query['page'] ? Number(req.query['page']) : 1;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
    const result = await inventoryService.listStockCountSessions({ locationId, status, page, limit });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getStockCountSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getStockCountSessionById(req.params['id'] as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Operations List ──────────────────────────────────────────────────────────
export async function listOperations(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query['type'] ? OperationTypeEnum.parse(req.query['type']) : undefined;
    const status = req.query['status'] ? OperationStatusEnum.parse(req.query['status']) : undefined;
    const page = req.query['page'] ? Number(req.query['page']) : 1;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;

    const result = await inventoryService.listOperations({ type, status, page, limit });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getOperation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getOperationById(req.params['id'] as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Reconciliation ───────────────────────────────────────────────────────────
export async function getReconciliationReport(req: Request, res: Response, next: NextFunction) {
  try {
    const medicineId = req.query['medicineId'] as string | undefined;
    const result = await inventoryService.reconcileStock(medicineId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

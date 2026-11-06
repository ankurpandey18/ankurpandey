import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service.js';
import { fefoService } from '../fefo/fefo.service.js';
import { FefoPreviewQuerySchema } from '@medstore/shared';

export async function getExpiryReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = req.query['filter'] as any;
    const items = await reportsService.getExpiryReport(filter);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function getLowStockReport(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query['search'] as string | undefined;
    const categoryId = req.query['categoryId'] ? Number(req.query['categoryId']) : undefined;
    const items = await reportsService.getLowStockReport({ search, categoryId });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryValuation(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reportsService.getInventoryValuation();
    res.json({ success: true, data: data });
  } catch (err) {
    next(err);
  }
}

export async function getFefoPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const query = FefoPreviewQuerySchema.parse(req.query);
    const result = await fefoService.recommendBatches(query.medicineId, query.requestedQuantity);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { batchesService } from './batches.service.js';
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  BatchListQuerySchema,
} from '@medstore/shared';

export async function listBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const query = BatchListQuerySchema.parse(req.query);
    const result = await batchesService.list(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const batch = await batchesService.getById(req.params['id'] as string);
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateBatchSchema.parse(req.body);
    const batch = await batchesService.create(input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateBatchSchema.parse(req.body);
    const batch = await batchesService.update(req.params['id'] as string, input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/auth.js';
import { listAuditLogs, getAuditLog } from './audit.service.js';
import { AuditListQuerySchema } from '@medstore/shared';
import { NotFoundError } from '../../middleware/errorHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = AuditListQuerySchema.parse(req.query);
  const result = await listAuditLogs(query);
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const log = await getAuditLog(req.params['id'] as string);
  if (!log) throw new NotFoundError('Audit log');
  res.status(200).json({ success: true, data: log });
});

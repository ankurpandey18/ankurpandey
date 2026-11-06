import { Request, Response, NextFunction } from 'express';
import { medicinesService } from './medicines.service.js';
import {
  CreateMedicineSchema,
  UpdateMedicineSchema,
  MedicineListQuerySchema,
} from '@medstore/shared';

export async function listMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const query = MedicineListQuerySchema.parse(req.query);
    const result = await medicinesService.list(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMedicine(req: Request, res: Response, next: NextFunction) {
  try {
    const medicine = await medicinesService.getById(req.params['id'] as string);
    res.json({ success: true, data: medicine });
  } catch (err) {
    next(err);
  }
}

export async function createMedicine(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateMedicineSchema.parse(req.body);
    const medicine = await medicinesService.create(input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.status(201).json({ success: true, data: medicine });
  } catch (err) {
    next(err);
  }
}

export async function updateMedicine(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateMedicineSchema.parse(req.body);
    const medicine = await medicinesService.update(req.params['id'] as string, input, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.json({ success: true, data: medicine });
  } catch (err) {
    next(err);
  }
}

export async function deactivateMedicine(req: Request, res: Response, next: NextFunction) {
  try {
    const medicine = await medicinesService.deactivate(req.params['id'] as string, req.session?.userId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    res.json({ success: true, data: medicine, message: 'Medicine deactivated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function addBarcode(req: Request, res: Response, next: NextFunction) {
  try {
    const barcode = req.body.barcode;
    const packagingType = req.body.packagingType || 'BASE_UNIT';
    const result = await medicinesService.addBarcode(req.params['id'] as string, barcode, packagingType);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

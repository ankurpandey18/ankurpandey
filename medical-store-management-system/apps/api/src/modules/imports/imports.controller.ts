import { Request, Response, NextFunction } from 'express';
import { importsService } from './imports.service.js';

export async function previewMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const csvText = typeof req.body === 'string' ? req.body : req.body.csvText;
    const result = await importsService.previewMedicinesCsv(csvText);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function commitMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = req.body.rows;
    const result = await importsService.commitMedicines(rows, req.session?.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function exportInventory(_req: Request, res: Response, next: NextFunction) {
  try {
    const csvContent = await importsService.exportInventoryCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

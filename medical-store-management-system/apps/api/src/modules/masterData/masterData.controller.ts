import { Request, Response, NextFunction } from 'express';
import { masterDataService } from './masterData.service.js';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateManufacturerSchema,
  UpdateManufacturerSchema,
  CreateDosageFormSchema,
  CreateAdministrationRouteSchema,
  CreateMeasurementUnitSchema,
  CreateCompositionSchema,
} from '@medstore/shared';

// ─── Categories ───────────────────────────────────────────────────────────────
export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query['includeInactive'] === 'true';
    const categories = await masterDataService.listCategories(includeInactive);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await masterDataService.getCategoryById(Number(req.params['id']));
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCategorySchema.parse(req.body);
    const category = await masterDataService.createCategory(input);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateCategorySchema.parse(req.body);
    const category = await masterDataService.updateCategory(Number(req.params['id']), input);
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

// ─── Manufacturers ────────────────────────────────────────────────────────────
export async function listManufacturers(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query['includeInactive'] === 'true';
    const manufacturers = await masterDataService.listManufacturers(includeInactive);
    res.json({ success: true, data: manufacturers });
  } catch (err) {
    next(err);
  }
}

export async function getManufacturer(req: Request, res: Response, next: NextFunction) {
  try {
    const manufacturer = await masterDataService.getManufacturerById(Number(req.params['id']));
    res.json({ success: true, data: manufacturer });
  } catch (err) {
    next(err);
  }
}

export async function createManufacturer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateManufacturerSchema.parse(req.body);
    const manufacturer = await masterDataService.createManufacturer(input);
    res.status(201).json({ success: true, data: manufacturer });
  } catch (err) {
    next(err);
  }
}

export async function updateManufacturer(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateManufacturerSchema.parse(req.body);
    const manufacturer = await masterDataService.updateManufacturer(Number(req.params['id']), input);
    res.json({ success: true, data: manufacturer });
  } catch (err) {
    next(err);
  }
}

// ─── Dosage Forms ─────────────────────────────────────────────────────────────
export async function listDosageForms(_req: Request, res: Response, next: NextFunction) {
  try {
    const dosageForms = await masterDataService.listDosageForms();
    res.json({ success: true, data: dosageForms });
  } catch (err) {
    next(err);
  }
}

export async function createDosageForm(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateDosageFormSchema.parse(req.body);
    const item = await masterDataService.createDosageForm(input);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ─── Administration Routes ───────────────────────────────────────────────────
export async function listAdministrationRoutes(_req: Request, res: Response, next: NextFunction) {
  try {
    const routes = await masterDataService.listAdministrationRoutes();
    res.json({ success: true, data: routes });
  } catch (err) {
    next(err);
  }
}

export async function createAdministrationRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateAdministrationRouteSchema.parse(req.body);
    const item = await masterDataService.createAdministrationRoute(input);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ─── Measurement Units ───────────────────────────────────────────────────────
export async function listMeasurementUnits(_req: Request, res: Response, next: NextFunction) {
  try {
    const units = await masterDataService.listMeasurementUnits();
    res.json({ success: true, data: units });
  } catch (err) {
    next(err);
  }
}

export async function createMeasurementUnit(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateMeasurementUnitSchema.parse(req.body);
    const item = await masterDataService.createMeasurementUnit(input);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// ─── Compositions ────────────────────────────────────────────────────────────
export async function listCompositions(req: Request, res: Response, next: NextFunction) {
  try {
    const search = req.query['search'] as string | undefined;
    const items = await masterDataService.listCompositions(search);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function createComposition(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCompositionSchema.parse(req.body);
    const item = await masterDataService.createComposition(input);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './masterData.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', ctrl.listCategories);
router.get('/categories/:id', ctrl.getCategory);
router.post('/categories', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createCategory);
router.patch('/categories/:id', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.updateCategory);

// ─── Manufacturers ────────────────────────────────────────────────────────────
router.get('/manufacturers', ctrl.listManufacturers);
router.get('/manufacturers/:id', ctrl.getManufacturer);
router.post('/manufacturers', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createManufacturer);
router.patch('/manufacturers/:id', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.updateManufacturer);

// ─── Dosage Forms ─────────────────────────────────────────────────────────────
router.get('/dosage-forms', ctrl.listDosageForms);
router.post('/dosage-forms', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createDosageForm);

// ─── Administration Routes ────────────────────────────────────────────────────
router.get('/administration-routes', ctrl.listAdministrationRoutes);
router.post('/administration-routes', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createAdministrationRoute);

// ─── Measurement Units ────────────────────────────────────────────────────────
router.get('/units', ctrl.listMeasurementUnits);
router.post('/units', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createMeasurementUnit);

// ─── Compositions ─────────────────────────────────────────────────────────────
router.get('/compositions', ctrl.listCompositions);
router.post('/compositions', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createComposition);

export default router;

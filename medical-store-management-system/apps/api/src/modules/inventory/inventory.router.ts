import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './inventory.controller.js';
import { getFefoPreview } from '../reports/reports.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

// ─── FEFO Preview ─────────────────────────────────────────────────────────────
router.get('/fefo-preview', requirePermission(PermissionKey.INVENTORY_READ), getFefoPreview);

// ─── Locations ────────────────────────────────────────────────────────────────
router.get('/locations', requirePermission(PermissionKey.INVENTORY_READ), ctrl.listLocations);
router.post('/locations', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.createLocation);
router.patch('/locations/:id', requirePermission(PermissionKey.MASTER_DATA_WRITE), ctrl.updateLocation);

// ─── Stock Balances & Ledger ──────────────────────────────────────────────────
router.get('/balances', requirePermission(PermissionKey.INVENTORY_READ), ctrl.listBalances);
router.get('/ledger', requirePermission(PermissionKey.INVENTORY_READ), ctrl.listLedger);
router.get('/reconciliation', requirePermission(PermissionKey.REPORTS_READ), ctrl.getReconciliationReport);

// ─── Operations (List & Detail) ───────────────────────────────────────────────
router.get('/operations', requirePermission(PermissionKey.INVENTORY_READ), ctrl.listOperations);
router.get('/operations/:id', requirePermission(PermissionKey.INVENTORY_READ), ctrl.getOperation);

// ─── Opening Stock ────────────────────────────────────────────────────────────
router.post('/opening-stock', requirePermission(PermissionKey.OPENING_STOCK_CREATE), ctrl.createOpeningStock);
router.post('/opening-stock/:id/submit', requirePermission(PermissionKey.OPENING_STOCK_CREATE), ctrl.submitOpeningStock);
router.post('/opening-stock/:id/approve', requirePermission(PermissionKey.OPENING_STOCK_APPROVE), ctrl.approveOpeningStock);
router.post('/opening-stock/:id/post', requirePermission(PermissionKey.OPENING_STOCK_APPROVE), ctrl.postOpeningStock);

// ─── Adjustments ──────────────────────────────────────────────────────────────
router.post('/adjustments', requirePermission(PermissionKey.ADJUSTMENTS_CREATE), ctrl.createAdjustment);
router.post('/adjustments/:id/decide', requirePermission(PermissionKey.ADJUSTMENTS_APPROVE), ctrl.decideAdjustment);
router.post('/adjustments/:id/post', requirePermission(PermissionKey.ADJUSTMENTS_APPROVE), ctrl.postAdjustment);

// ─── Transfers ────────────────────────────────────────────────────────────────
router.post('/transfers', requirePermission(PermissionKey.TRANSFERS_CREATE), ctrl.createTransfer);

// ─── Stock Counts ─────────────────────────────────────────────────────────────
router.get('/counts', requirePermission(PermissionKey.INVENTORY_READ), ctrl.listStockCountSessions);
router.get('/counts/:id', requirePermission(PermissionKey.INVENTORY_READ), ctrl.getStockCountSession);
router.post('/counts', requirePermission(PermissionKey.STOCK_COUNTS_CREATE), ctrl.createStockCountSession);
router.post('/counts/:id/items', requirePermission(PermissionKey.STOCK_COUNTS_CREATE), ctrl.recordStockCountItems);
router.post('/counts/:id/submit', requirePermission(PermissionKey.STOCK_COUNTS_CREATE), ctrl.submitStockCountSession);
router.post('/counts/:id/decide', requirePermission(PermissionKey.STOCK_COUNTS_APPROVE), ctrl.decideStockCountSession);
router.post('/counts/:id/post', requirePermission(PermissionKey.STOCK_COUNTS_APPROVE), ctrl.postStockCountSession);

export default router;

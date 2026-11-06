import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './reports.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/expiry', requirePermission(PermissionKey.REPORTS_READ), ctrl.getExpiryReport);
router.get('/low-stock', requirePermission(PermissionKey.REPORTS_READ), ctrl.getLowStockReport);
router.get('/valuation', requirePermission(PermissionKey.REPORTS_READ), ctrl.getInventoryValuation);
router.get('/fefo-preview', requirePermission(PermissionKey.INVENTORY_READ), ctrl.getFefoPreview);

export default router;

import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './imports.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.post('/medicines/preview', requirePermission(PermissionKey.IMPORT_EXPORT_MANAGE), ctrl.previewMedicines);
router.post('/medicines/commit', requirePermission(PermissionKey.IMPORT_EXPORT_MANAGE), ctrl.commitMedicines);
router.get('/inventory/export', requirePermission(PermissionKey.REPORTS_READ), ctrl.exportInventory);

export default router;

import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './medicines.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/', requirePermission(PermissionKey.MEDICINES_READ), ctrl.listMedicines);
router.get('/:id', requirePermission(PermissionKey.MEDICINES_READ), ctrl.getMedicine);

router.post('/', requirePermission(PermissionKey.MEDICINES_WRITE), ctrl.createMedicine);
router.patch('/:id', requirePermission(PermissionKey.MEDICINES_WRITE), ctrl.updateMedicine);
router.post('/:id/deactivate', requirePermission(PermissionKey.MEDICINES_DEACTIVATE), ctrl.deactivateMedicine);
router.post('/:id/barcodes', requirePermission(PermissionKey.MEDICINES_WRITE), ctrl.addBarcode);

export default router;

import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './batches.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/', requirePermission(PermissionKey.BATCHES_READ), ctrl.listBatches);
router.get('/:id', requirePermission(PermissionKey.BATCHES_READ), ctrl.getBatch);

router.post('/', requirePermission(PermissionKey.BATCHES_WRITE), ctrl.createBatch);
router.patch('/:id', requirePermission(PermissionKey.BATCHES_WRITE), ctrl.updateBatch);

export default router;

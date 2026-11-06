import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './audit.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);
router.use(requirePermission(PermissionKey.AUDIT_READ));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

export default router;

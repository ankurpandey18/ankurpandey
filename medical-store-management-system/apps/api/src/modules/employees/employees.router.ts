import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './employees.controller.js';

const router = Router();

// All employee routes require authentication and completed password change
router.use(requireAuth);
router.use(requirePasswordChanged);

// Read access
router.get('/', requirePermission(PermissionKey.EMPLOYEES_READ), ctrl.list);
router.get('/:id', requirePermission(PermissionKey.EMPLOYEES_READ), ctrl.getOne);

// Write access (OWNER only via permission)
router.post('/', requirePermission(PermissionKey.EMPLOYEES_WRITE), ctrl.create);
router.patch('/:id', requirePermission(PermissionKey.EMPLOYEES_WRITE), ctrl.update);
router.post('/:id/activate', requirePermission(PermissionKey.EMPLOYEES_DEACTIVATE), ctrl.activate);
router.post('/:id/deactivate', requirePermission(PermissionKey.EMPLOYEES_DEACTIVATE), ctrl.deactivate);
router.post('/:id/reset-password', requirePermission(PermissionKey.EMPLOYEES_WRITE), ctrl.resetPassword);

export default router;

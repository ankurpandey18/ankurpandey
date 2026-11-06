import { Router } from 'express';
import { requireAuth, requirePermission, requirePasswordChanged } from '../../middleware/auth.js';
import { PermissionKey } from '@medstore/shared';
import * as ctrl from './dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/owner', requirePermission(PermissionKey.DASHBOARD_OWNER), ctrl.ownerDashboard);
router.get('/pharmacist', requirePermission(PermissionKey.DASHBOARD_PHARMACIST), ctrl.pharmacistDashboard);
router.get('/billing-staff', requirePermission(PermissionKey.DASHBOARD_BILLING), ctrl.billingDashboard);

export default router;

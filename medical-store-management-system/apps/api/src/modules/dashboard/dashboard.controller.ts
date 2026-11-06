import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/auth.js';
import {
  getOwnerDashboardStats,
  getPharmacistDashboardStats,
  getBillingStaffDashboardStats,
} from './dashboard.service.js';
import { UnauthorizedError } from '../../middleware/errorHandler.js';

export const ownerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getOwnerDashboardStats();
  res.status(200).json({ success: true, data: stats });
});

export const pharmacistDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const stats = await getPharmacistDashboardStats(req.session.userId);
  res.status(200).json({ success: true, data: stats });
});

export const billingDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const stats = await getBillingStaffDashboardStats(req.session.userId);
  res.status(200).json({ success: true, data: stats });
});

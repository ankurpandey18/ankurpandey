import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/auth.js';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
  resetEmployeePassword,
} from './employees.service.js';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmployeeListQuerySchema,
  ResetPasswordSchema,
} from '@medstore/shared';
import { UnauthorizedError } from '../../middleware/errorHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = EmployeeListQuerySchema.parse(req.query);
  const result = await listEmployees(query);
  res.status(200).json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const result = await getEmployee(id);
  res.status(200).json({ success: true, data: result });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const body = CreateEmployeeSchema.parse(req.body);
  const result = await createEmployee(body, req.session.userId, req);
  res.status(201).json({ success: true, data: result, message: 'Employee created successfully' });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const id = req.params['id'] as string;
  const body = UpdateEmployeeSchema.parse(req.body);
  const result = await updateEmployee(id, body, req.session.userId, req);
  res.status(200).json({ success: true, data: result, message: 'Employee updated successfully' });
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const id = req.params['id'] as string;
  const result = await activateEmployee(id, req.session.userId, req);
  res.status(200).json({ success: true, data: result, message: 'Employee activated' });
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const id = req.params['id'] as string;
  const result = await deactivateEmployee(id, req.session.userId, req);
  res.status(200).json({ success: true, data: result, message: 'Employee deactivated' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.session.userId) throw new UnauthorizedError();
  const id = req.params['id'] as string;
  const body = ResetPasswordSchema.parse(req.body);
  await resetEmployeePassword(id, body.temporaryPassword, req.session.userId, req);
  res.status(200).json({ success: true, data: null, message: 'Password reset. Employee must change it on next login.' });
});

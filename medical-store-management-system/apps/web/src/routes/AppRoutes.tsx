import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EmployeeListPage } from '../pages/EmployeeListPage';
import { AddEmployeePage } from '../pages/AddEmployeePage';
import { EmployeeDetailPage } from '../pages/EmployeeDetailPage';
import { EditEmployeePage } from '../pages/EditEmployeePage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { ProfilePage } from '../pages/ProfilePage';
import {
  ForceChangePasswordPage,
  UnauthorizedPage,
  NotFoundPage,
} from '../pages/misc';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Force password change — authenticated but no layout */}
      <Route path="/force-change-password" element={<ForceChangePasswordPage />} />

      {/* Protected root → redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected — all authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Protected — OWNER only */}
      <Route element={<ProtectedRoute requiredRole={['OWNER']} />}>
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/new" element={<AddEmployeePage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/employees/:id/edit" element={<EditEmployeePage />} />
        <Route path="/audit" element={<AuditLogsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

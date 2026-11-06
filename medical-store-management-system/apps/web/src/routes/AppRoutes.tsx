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

// Phase 2: Medicine Catalogue
import { MedicineListPage } from '../pages/medicines/MedicineListPage';
import { AddMedicinePage } from '../pages/medicines/AddMedicinePage';
import { EditMedicinePage } from '../pages/medicines/EditMedicinePage';
import { MedicineDetailPage } from '../pages/medicines/MedicineDetailPage';
import { MasterDataPage } from '../pages/medicines/MasterDataPage';

// Phase 2: Batches
import { BatchListPage } from '../pages/batches/BatchListPage';

// Phase 2: Inventory Operations
import { InventoryOverviewPage } from '../pages/inventory/InventoryOverviewPage';
import { StockLedgerPage } from '../pages/inventory/StockLedgerPage';
import { OpeningStockPage } from '../pages/inventory/OpeningStockPage';
import { StockAdjustmentsPage } from '../pages/inventory/StockAdjustmentsPage';
import { StockTransfersPage } from '../pages/inventory/StockTransfersPage';
import { StockCountPage } from '../pages/inventory/StockCountPage';

// Phase 2: Reports & Tools
import { ExpiryMonitorPage } from '../pages/reports/ExpiryMonitorPage';
import { LowStockPage } from '../pages/reports/LowStockPage';
import { FefoSimulatorPage } from '../pages/reports/FefoSimulatorPage';

// Phase 2: Import / Export
import { ImportExportPage } from '../pages/imports/ImportExportPage';

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

      {/* Protected — all authenticated users (Owner, Pharmacist, Billing Staff) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Read catalogue & stock information */}
        <Route path="/medicines" element={<MedicineListPage />} />
        <Route path="/medicines/:id" element={<MedicineDetailPage />} />
        <Route path="/batches" element={<BatchListPage />} />
        <Route path="/inventory" element={<InventoryOverviewPage />} />
        <Route path="/inventory/ledger" element={<StockLedgerPage />} />
        <Route path="/inventory/adjustments" element={<StockAdjustmentsPage />} />
        <Route path="/reports/expiry" element={<ExpiryMonitorPage />} />
        <Route path="/reports/low-stock" element={<LowStockPage />} />
        <Route path="/reports/fefo" element={<FefoSimulatorPage />} />
      </Route>

      {/* Protected — OWNER and PHARMACIST (Inventory Operatives) */}
      <Route element={<ProtectedRoute requiredRole={['OWNER', 'PHARMACIST']} />}>
        <Route path="/medicines/new" element={<AddMedicinePage />} />
        <Route path="/medicines/:id/edit" element={<EditMedicinePage />} />
        <Route path="/inventory/opening-stock" element={<OpeningStockPage />} />
        <Route path="/inventory/transfers" element={<StockTransfersPage />} />
        <Route path="/inventory/counts" element={<StockCountPage />} />
        <Route path="/imports" element={<ImportExportPage />} />
      </Route>

      {/* Protected — OWNER only */}
      <Route element={<ProtectedRoute requiredRole={['OWNER']} />}>
        <Route path="/master-data" element={<MasterDataPage />} />
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

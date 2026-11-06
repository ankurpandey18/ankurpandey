import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  AlertTriangle,
  Plus,
  Eye,
  ClipboardList,
  User,
  TrendingUp,
  LogIn,
  ShieldAlert,
  Package,
  Receipt,
  Stethoscope,
  Clock,
  Boxes,
  Pill,
  ArrowRightLeft,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, medicinesApi } from '../services/api';
import { Skeleton, Button, EmptyState } from '../components/ui';
import { formatAuditAction, formatDate } from '../utils';

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color = 'brand',
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'brand' | 'emerald' | 'red' | 'amber' | 'violet' | 'blue';
  loading?: boolean;
}) {
  const colorStyles: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  if (loading) {
    return (
      <div className="stat-card">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-6 w-16 mt-2" />
        <Skeleton className="h-3 w-24 mt-1" />
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorStyles[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-navy-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  );
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────
export function OwnerDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => dashboardApi.owner() as Promise<any>,
    staleTime: 30_000,
  });

  const stats = data?.stats;
  const recentActivity = data?.recentActivity ?? [];
  const recentMovements = data?.recentMovements ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy-900">Owner Operations Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Store intelligence, inventory balances, formulation records, and employee controls
        </p>
      </div>

      {/* Phase 2 Inventory KPI Section */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Medicine & Stock Telemetry
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            label="Active Medicines"
            value={stats?.activeMedicineCount ?? 0}
            icon={<Package className="w-4 h-4" />}
            color="brand"
            loading={isLoading}
          />
          <StatCard
            label="Active Batches"
            value={stats?.totalActiveBatches ?? 0}
            icon={<Pill className="w-4 h-4" />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            label="Stock on Hand"
            value={stats?.totalStockQuantity ?? 0}
            icon={<Boxes className="w-4 h-4" />}
            color="emerald"
            loading={isLoading}
          />
          <StatCard
            label="Low Stock Alert"
            value={stats?.lowStockCount ?? 0}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={stats?.lowStockCount > 0 ? 'red' : 'emerald'}
            loading={isLoading}
          />
          <StatCard
            label="Expired Batches"
            value={stats?.expiredBatchCount ?? 0}
            icon={<Clock className="w-4 h-4" />}
            color="red"
            loading={isLoading}
          />
          <StatCard
            label="Expiring &le; 30d"
            value={stats?.expiring30DaysCount ?? 0}
            icon={<Clock className="w-4 h-4" />}
            color="amber"
            loading={isLoading}
          />
          <StatCard
            label="Pending Approvals"
            value={stats?.pendingApprovalsCount ?? 0}
            icon={<ClipboardList className="w-4 h-4" />}
            color="violet"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Staff & Authentication Stats */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Staff & Access Security
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Staff"
            value={stats?.totalEmployees ?? 0}
            icon={<Users className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            label="Active Employees"
            value={stats?.activeEmployees ?? 0}
            icon={<UserCheck className="w-4 h-4" />}
            color="emerald"
            loading={isLoading}
          />
          <StatCard
            label="Pharmacists"
            value={stats?.pharmacistCount ?? 0}
            icon={<Stethoscope className="w-4 h-4" />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            label="Billing Staff"
            value={stats?.billingStaffCount ?? 0}
            icon={<Receipt className="w-4 h-4" />}
            color="amber"
            loading={isLoading}
          />
          <StatCard
            label="Logins Today"
            value={stats?.successfulLoginsToday ?? 0}
            icon={<LogIn className="w-4 h-4" />}
            color="emerald"
            loading={isLoading}
          />
          <StatCard
            label="Failed Logins"
            value={stats?.failedLoginsToday ?? 0}
            icon={<ShieldAlert className="w-4 h-4" />}
            color={stats?.failedLoginsToday > 0 ? 'red' : 'emerald'}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Operational Shortcuts</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/medicines/new')}
            id="quick-add-medicine"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Medicine
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/opening-stock')}
            id="quick-opening-stock"
          >
            <Boxes className="w-4 h-4 mr-1" />
            Opening Stock
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/adjustments')}
            id="quick-adjustments"
          >
            <ClipboardList className="w-4 h-4 mr-1" />
            Stock Adjustments
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/reports/expiry')}
            id="quick-expiry"
          >
            <Clock className="w-4 h-4 mr-1" />
            Expiry Monitor
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/reports/low-stock')}
            id="quick-low-stock"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Low Stock Alerts
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/ledger')}
            id="quick-ledger"
          >
            <ClipboardList className="w-4 h-4 mr-1" />
            Stock Ledger
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/employees')}
            id="quick-employees"
          >
            <Users className="w-4 h-4 mr-1" />
            Employees
          </Button>
        </div>
      </div>

      {/* Dual Activity Grid: Recent Stock Movements & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-800">Recent Stock Movements</h2>
            <button
              onClick={() => navigate('/inventory/ledger')}
              className="text-xs text-brand-600 hover:underline"
            >
              View Full Ledger &rarr;
            </button>
          </div>
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : recentMovements.length === 0 ? (
              <EmptyState
                icon={<Boxes className="w-6 h-6" />}
                title="No stock movements yet"
                description="Movements will record automatically as inventory is added or adjusted."
              />
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b text-[10px] uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Change</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMovements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{m.medicineName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {m.movementType} ({m.batchNumber})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.locationName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={m.quantityChange > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {m.quantityAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Audit Activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-800">System Security Logs</h2>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-brand-600 hover:underline"
            >
              View All Logs &rarr;
            </button>
          </div>
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState icon={<Activity className="w-6 h-6" />} title="No audit events logged" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((event: any) => (
                  <li key={event.id} className="flex items-start gap-3 p-3 hover:bg-slate-50/70">
                    <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 font-medium">
                        {formatAuditAction(event.action)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        by {event.actorName} &middot; {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pharmacist Dashboard ─────────────────────────────────────────────────────
export function PharmacistDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'pharmacist'],
    queryFn: () => dashboardApi.pharmacist() as Promise<any>,
    staleTime: 30_000,
  });

  const inv = data?.inventory;
  const recentMovements = data?.recentMovements ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Pharmacist Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dispensing inventory overview, stock operations, and batch monitoring
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Active Catalogue"
          value={inv?.activeMedicineCount ?? 0}
          icon={<Package className="w-5 h-5" />}
          color="brand"
          loading={isLoading}
        />
        <StatCard
          label="Low Stock Medicines"
          value={inv?.lowStockCount ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={inv?.lowStockCount > 0 ? 'red' : 'emerald'}
          loading={isLoading}
        />
        <StatCard
          label="Expiring &le; 30d"
          value={inv?.expiring30DaysCount ?? 0}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Pending Submissions"
          value={inv?.pendingSubmissionsCount ?? 0}
          icon={<ClipboardList className="w-5 h-5" />}
          color="blue"
          loading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-4 space-y-3">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quick Tasks</h2>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/medicines/new')}
            id="pharma-quick-add-med"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Medicine
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/opening-stock')}
            id="pharma-quick-opening"
          >
            <Boxes className="w-4 h-4 mr-1" /> Submit Opening Stock
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/adjustments')}
            id="pharma-quick-adj"
          >
            <AlertTriangle className="w-4 h-4 mr-1" /> Request Stock Adjustment
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/inventory/transfers')}
            id="pharma-quick-trans"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer Stock
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/reports/fefo')}
            id="pharma-quick-fefo"
          >
            <Sparkles className="w-4 h-4 mr-1" /> FEFO Simulator
          </Button>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Recent Store Inventory Movements
          </h2>
          <button
            onClick={() => navigate('/inventory/ledger')}
            className="text-xs text-brand-600 hover:underline"
          >
            View Ledger &rarr;
          </button>
        </div>

        {recentMovements.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-6 h-6" />}
            title="No movements yet"
            description="Inventory transactions will appear here."
          />
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-[10px] uppercase font-semibold text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Medicine</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-right">Change</th>
                <th className="py-2.5 px-3 text-right">Current Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMovements.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{m.medicineName}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {m.movementType} &middot; Batch: {m.batchNumber}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{m.locationName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={m.quantityChange > 0 ? 'text-emerald-700' : 'text-red-600'}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                    {m.quantityAfter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Billing Staff Dashboard ──────────────────────────────────────────────────
export function BillingDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['medicines', { search: searchTerm, limit: 5 }],
    queryFn: () => medicinesApi.list({ search: searchTerm, limit: 5, isActive: true }),
    enabled: searchTerm.trim().length >= 2,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Billing Staff Workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Medicine catalogue lookup and read-only physical stock availability
        </p>
      </div>

      {/* Quick Lookup Box */}
      <div className="card p-6 border-l-4 border-l-amber-500 space-y-4">
        <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
          Medicine & Stock Lookup
        </h2>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Type brand name, generic formulation, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            id="billing-search-input"
          />
        </div>

        {/* Results dropdown */}
        {searchLoading ? (
          <div className="py-6 flex justify-center">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : searchResults?.items && searchResults.items.length > 0 ? (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            {searchResults.items.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/medicines/${m.id}`)}
                className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm text-navy-900">{m.brandName}</p>
                  <p className="text-xs text-slate-500">
                    {m.genericName} &middot; {m.dosageForm?.name ?? ''}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400">SKU: {m.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                    View Availability
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm.trim().length >= 2 ? (
          <p className="text-xs text-slate-400 italic">No matching medicines found.</p>
        ) : (
          <p className="text-xs text-slate-400">
            Type at least 2 characters to search for medicines.
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/medicines')}
          className="card p-4 text-left hover:border-brand-500 transition-colors"
        >
          <Package className="w-6 h-6 text-brand-600 mb-2" />
          <h3 className="font-bold text-sm text-navy-900">Browse Full Medicine Catalogue</h3>
          <p className="text-xs text-slate-500 mt-1">
            View formulations, strengths, packaging details, and pricing.
          </p>
        </button>

        <button
          onClick={() => navigate('/inventory')}
          className="card p-4 text-left hover:border-brand-500 transition-colors"
        >
          <Boxes className="w-6 h-6 text-emerald-600 mb-2" />
          <h3 className="font-bold text-sm text-navy-900">View Stock by Location</h3>
          <p className="text-xs text-slate-500 mt-1">
            Check on-hand quantities across racks, shelves, and storage cabinets.
          </p>
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Router ─────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'OWNER') return <OwnerDashboard />;
  if (user?.role === 'PHARMACIST') return <PharmacistDashboard />;
  if (user?.role === 'BILLING_STAFF') return <BillingDashboard />;

  return (
    <EmptyState
      title="Unknown role"
      description="Please contact your system administrator."
    />
  );
}

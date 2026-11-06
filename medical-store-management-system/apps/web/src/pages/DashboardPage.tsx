import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCheck, UserX, Activity, AlertTriangle,
  Plus, Eye, ClipboardList, User, TrendingUp, LogIn,
  ShieldAlert, Package, Receipt, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';
import { Skeleton, Button, EmptyState } from '../components/ui';
import { formatAuditAction, formatDate } from '../utils';

// ─── Owner Dashboard ──────────────────────────────────────────────────────────
interface OwnerStats {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    pharmacistCount: number;
    billingStaffCount: number;
    ownerCount: number;
    successfulLoginsToday: number;
    failedLoginsToday: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    actorName: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
}

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

export function OwnerDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => dashboardApi.owner() as Promise<OwnerStats>,
    staleTime: 60_000,
  });

  const stats = data?.stats;
  const recentActivity = data?.recentActivity ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy-900">Owner Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time overview of your medical store operations
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={stats?.totalEmployees ?? 0}
          icon={<Users className="w-5 h-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Active"
          value={stats?.activeEmployees ?? 0}
          icon={<UserCheck className="w-5 h-5" />}
          color="emerald"
          loading={isLoading}
        />
        <StatCard
          label="Inactive"
          value={stats?.inactiveEmployees ?? 0}
          icon={<UserX className="w-5 h-5" />}
          color="red"
          loading={isLoading}
        />
        <StatCard
          label="Pharmacists"
          value={stats?.pharmacistCount ?? 0}
          icon={<Stethoscope className="w-5 h-5" />}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="Billing Staff"
          value={stats?.billingStaffCount ?? 0}
          icon={<Receipt className="w-5 h-5" />}
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Logins Today"
          value={stats?.successfulLoginsToday ?? 0}
          icon={<LogIn className="w-5 h-5" />}
          color="emerald"
          loading={isLoading}
        />
        <StatCard
          label="Failed Logins"
          value={stats?.failedLoginsToday ?? 0}
          icon={<ShieldAlert className="w-5 h-5" />}
          color="red"
          loading={isLoading}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employees/new')}
            id="quick-add-employee"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/employees')}
            id="quick-view-employees"
          >
            <Eye className="w-4 h-4" />
            View Employees
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/audit')}
            id="quick-view-audit"
          >
            <ClipboardList className="w-4 h-4" />
            Audit Logs
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/profile')}
            id="quick-profile"
          >
            <User className="w-4 h-4" />
            My Profile
          </Button>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Activity</h2>
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-6 h-6" />}
              title="No activity yet"
              description="Audit events will appear here as users take actions in the system."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((event) => (
                <li key={event.id} className="flex items-start gap-3 p-4 hover:bg-slate-50/70">
                  <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">
                      {formatAuditAction(event.action)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      by {event.actorName} &middot; {formatDate(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Future modules notice */}
      <div className="card p-5 border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Coming in Phase 2
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['Inventory & Catalogue', 'Billing & POS', 'Prescriptions', 'Supplier Management', 'Expiry Tracking', 'Reports & Analytics'].map(
            (m) => (
              <div
                key={m}
                className="flex items-center gap-2 text-xs text-slate-400 p-2 rounded-lg bg-white border border-slate-200"
              >
                <Package className="w-3.5 h-3.5 flex-shrink-0" />
                {m}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pharmacist Dashboard ─────────────────────────────────────────────────────
interface UserDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    role: string;
    employeeCode: string | null;
    lastLogin: string | null;
  } | null;
  recentActivity: Array<{ id: string; action: string; createdAt: string }>;
}

function UserDashboardShell({
  title,
  subtitle,
  roleColor,
  futureModule,
  data,
  isLoading,
}: {
  title: string;
  subtitle: string;
  roleColor: string;
  futureModule: string;
  data: UserDashboardData | undefined;
  isLoading: boolean;
}) {
  const user = data?.user;
  const activity = data?.recentActivity ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-navy-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl ${roleColor} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
          >
            {isLoading ? '?' : user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-navy-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {user?.status === 'ACTIVE' ? (
                    <span className="badge-active">Active</span>
                  ) : (
                    <span className="badge-inactive">Inactive</span>
                  )}
                  <span className="text-xs text-slate-500">
                    Code: {user?.employeeCode ?? '—'}
                  </span>
                  {user?.lastLogin && (
                    <span className="text-xs text-slate-500">
                      Last login: {formatDate(user.lastLogin)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">My Recent Activity</h2>
        <div className="card overflow-hidden">
          {activity.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-5 h-5" />}
              title="No activity yet"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((e) => (
                <li key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <Activity className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 flex-1">{formatAuditAction(e.action)}</span>
                  <span className="text-xs text-slate-400">{formatDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Future module placeholder */}
      <div className="card p-5 border-dashed border-slate-300 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-600">{futureModule}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              This module will be available in Phase 2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PharmacistDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'pharmacist'],
    queryFn: () => dashboardApi.pharmacist() as Promise<UserDashboardData>,
    staleTime: 60_000,
  });

  return (
    <UserDashboardShell
      title="Pharmacist Dashboard"
      subtitle="Welcome back. Your workspace is ready."
      roleColor="bg-blue-600"
      futureModule="Inventory & Prescription Management"
      data={data}
      isLoading={isLoading}
    />
  );
}

export function BillingDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'billing'],
    queryFn: () => dashboardApi.billingStaff() as Promise<UserDashboardData>,
    staleTime: 60_000,
  });

  return (
    <UserDashboardShell
      title="Billing Staff Dashboard"
      subtitle="Welcome back. Your billing workspace is ready."
      roleColor="bg-amber-600"
      futureModule="POS Billing & Sales"
      data={data}
      isLoading={isLoading}
    />
  );
}

// ─── Dashboard router (picks correct dashboard by role) ───────────────────────
export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'OWNER') return <OwnerDashboard />;
  if (user?.role === 'PHARMACIST') return <PharmacistDashboard />;
  if (user?.role === 'BILLING_STAFF') return <BillingDashboard />;

  return (
    <EmptyState
      title="Unknown role"
      description="Please contact your administrator."
    />
  );
}

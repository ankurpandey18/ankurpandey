import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, UserCheck, UserX, KeyRound,
  Edit, Eye, Users, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { employeesApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Button, EmptyState, Skeleton, Badge, PageHeader, ConfirmDialog,
} from '../components/ui';
import {
  formatDate, formatDateOnly, formatRoleName, getRoleBadgeClass, cn,
} from '../utils';
import type { EmployeeDto } from '@medstore/shared';

type FilterRole = '' | 'OWNER' | 'PHARMACIST' | 'BILLING_STAFF';
type FilterStatus = '' | 'ACTIVE' | 'INACTIVE';

function RoleBadge({ role }: { role: string }) {
  const cls = getRoleBadgeClass(role);
  return <span className={cls}>{formatRoleName(role)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return status === 'ACTIVE'
    ? <span className="badge-active">Active</span>
    : <span className="badge-inactive">Inactive</span>;
}

export function EmployeeListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<FilterRole>('');
  const [status, setStatus] = useState<FilterStatus>('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'deactivate';
    employee: EmployeeDto;
  } | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, debouncedSearch, role, status],
    queryFn: () =>
      employeesApi.list({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
    staleTime: 30_000,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'deactivate' }) =>
      action === 'activate' ? employeesApi.activate(id) : employeesApi.deactivate(id),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      success(action === 'activate' ? 'Employee activated' : 'Employee deactivated');
      setConfirmAction(null);
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Operation failed';
      showError('Failed', msg);
      setConfirmAction(null);
    },
  });

  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  if (isError) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-red-600">Failed to load employees. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Employees"
        description={`${total} employee${total !== 1 ? 's' : ''} in the system`}
        action={
          <Button onClick={() => navigate('/employees/new')} id="add-employee-btn">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        }
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name, email or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              id="employee-search"
              aria-label="Search employees"
            />
          </div>

          {/* Role filter */}
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as FilterRole); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="role-filter"
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="PHARMACIST">Pharmacist</option>
            <option value="BILLING_STAFF">Billing Staff</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as FilterStatus); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="status-filter"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No employees found"
            description={
              debouncedSearch || role || status
                ? 'Try adjusting your filters or search term.'
                : 'Get started by adding your first employee.'
            }
            action={
              !debouncedSearch && !role && !status ? (
                <Button size="sm" onClick={() => navigate('/employees/new')}>
                  <Plus className="w-4 h-4" />
                  Add Employee
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Code</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last Login</th>
                    <th scope="col">Joined</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-600">{emp.employeeCode}</td>
                      <td><RoleBadge role={emp.role} /></td>
                      <td><StatusBadge status={emp.status} /></td>
                      <td className="text-xs text-slate-500">{formatDate(emp.lastLogin)}</td>
                      <td className="text-xs text-slate-500">{formatDateOnly(emp.joiningDate)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            aria-label={`View ${emp.name}`}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${emp.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            aria-label={`Edit ${emp.name}`}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {emp.status === 'ACTIVE' ? (
                            <button
                              onClick={() => setConfirmAction({ type: 'deactivate', employee: emp })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label={`Deactivate ${emp.name}`}
                              title="Deactivate"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmAction({ type: 'activate', employee: emp })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              aria-label={`Activate ${emp.name}`}
                              title="Activate"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.email}</p>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role={emp.role} />
                    <span className="text-xs text-slate-500 font-mono">{emp.employeeCode}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/employees/${emp.id}`)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/employees/${emp.id}/edit`)}>
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} &middot; {total} employees
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction?.type === 'deactivate' ? 'Deactivate Employee' : 'Activate Employee'}
        message={
          confirmAction?.type === 'deactivate'
            ? `Deactivate ${confirmAction.employee.name}? They will no longer be able to log in.`
            : `Activate ${confirmAction?.employee.name}? They will regain access to the system.`
        }
        confirmLabel={confirmAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        variant={confirmAction?.type === 'deactivate' ? 'danger' : 'primary'}
        isLoading={toggleStatus.isPending}
        onConfirm={() => {
          if (confirmAction) {
            toggleStatus.mutate({ id: confirmAction.employee.id, action: confirmAction.type });
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

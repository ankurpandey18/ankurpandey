import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit, UserCheck, UserX, KeyRound,
  Mail, Phone, Calendar, Hash, Shield,
} from 'lucide-react';
import { employeesApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Button, Badge, PageHeader, Skeleton, ConfirmDialog,
} from '../components/ui';
import { formatDate, formatDateOnly, formatRoleName, getRoleBadgeClass } from '../utils';
import { ResetPasswordSchema, type ResetPasswordInput } from '@medstore/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function ResetPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const submit = (data: ResetPasswordInput) => onSubmit(data.temporaryPassword);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Reset Password</h2>
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-password" className="text-sm font-medium text-slate-700">
              Temporary Password <span className="text-red-500">*</span>
            </label>
            <input
              id="reset-password"
              type="password"
              {...register('temporaryPassword')}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Min 10 chars, upper+lower+digit+special"
            />
            {errors.temporaryPassword && (
              <p className="text-xs text-red-600">{errors.temporaryPassword.message}</p>
            )}
            <p className="text-xs text-slate-500">The employee must change this on next login.</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>Reset Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const [confirmToggle, setConfirmToggle] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      emp?.status === 'ACTIVE' ? employeesApi.deactivate(id!) : employeesApi.activate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      success(emp?.status === 'ACTIVE' ? 'Employee deactivated' : 'Employee activated');
      setConfirmToggle(false);
    },
    onError: (err) => {
      showError('Failed', err instanceof ApiClientError ? err.message : 'Operation failed');
    },
  });

  const resetPassword = useMutation({
    mutationFn: (pw: string) => employeesApi.resetPassword(id!, pw),
    onSuccess: () => {
      success('Password reset', 'Employee must change password on next login.');
      setShowResetModal(false);
    },
    onError: (err) => {
      showError('Failed', err instanceof ApiClientError ? err.message : 'Reset failed');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="card p-6 space-y-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!emp) {
    return <div className="card p-8 text-center text-sm text-red-600">Employee not found</div>;
  }

  const roleCls = getRoleBadgeClass(emp.role);

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader title="Employee Profile" />
      </div>

      <div className="card p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {emp.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-navy-900">{emp.name}</h2>
            <p className="text-sm text-slate-500">{emp.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={roleCls}>{formatRoleName(emp.role)}</span>
              {emp.status === 'ACTIVE'
                ? <span className="badge-active">Active</span>
                : <span className="badge-inactive">Inactive</span>}
              {emp.mustChangePassword && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Password change required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
          {[
            { icon: <Hash className="w-4 h-4" />, label: 'Employee Code', value: emp.employeeCode },
            { icon: <Phone className="w-4 h-4" />, label: 'Mobile', value: emp.phone ?? '—' },
            { icon: <Calendar className="w-4 h-4" />, label: 'Joined', value: formatDateOnly(emp.joiningDate) },
            { icon: <Shield className="w-4 h-4" />, label: 'Last Login', value: formatDate(emp.lastLogin) },
            { icon: <Calendar className="w-4 h-4" />, label: 'Account Created', value: formatDate(emp.createdAt) },
            { icon: <Calendar className="w-4 h-4" />, label: 'Last Updated', value: formatDate(emp.updatedAt) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="text-brand-500 mt-0.5 flex-shrink-0">{icon}</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className="text-sm text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 pt-5 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)} id="edit-employee-btn">
            <Edit className="w-4 h-4" /> Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowResetModal(true)} id="reset-password-btn">
            <KeyRound className="w-4 h-4" /> Reset Password
          </Button>
          {emp.status === 'ACTIVE' ? (
            <Button size="sm" variant="danger" onClick={() => setConfirmToggle(true)} id="deactivate-btn">
              <UserX className="w-4 h-4" /> Deactivate
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => setConfirmToggle(true)} id="activate-btn">
              <UserCheck className="w-4 h-4" /> Activate
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmToggle}
        title={emp.status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
        message={
          emp.status === 'ACTIVE'
            ? `${emp.name} will no longer be able to log in.`
            : `${emp.name} will regain access to the system.`
        }
        confirmLabel={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={emp.status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate()}
        onCancel={() => setConfirmToggle(false)}
      />

      <ResetPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSubmit={(pw) => resetPassword.mutate(pw)}
        isLoading={resetPassword.isPending}
      />
    </div>
  );
}

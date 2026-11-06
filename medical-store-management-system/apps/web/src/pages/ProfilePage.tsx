import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, User, Lock, Mail, Phone, Hash, Shield } from 'lucide-react';
import { ChangePasswordSchema, type ChangePasswordInput } from '@medstore/shared';
import { useAuth } from '../context/AuthContext';
import { authApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, PageHeader, Skeleton } from '../components/ui';
import { formatDate, formatDateOnly, formatRoleName, getRoleBadgeClass } from '../utils';

export function ProfilePage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      await authApi.changePassword(data);
      success('Password changed', 'Your password has been updated successfully.');
      reset();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Password change failed';
      showError('Failed', msg);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-8 w-32" />
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  const roleCls = getRoleBadgeClass(user.role);

  const PasswordField = ({
    id,
    label,
    name,
    show,
    onToggle,
    error,
  }: {
    id: string;
    label: string;
    name: keyof ChangePasswordInput;
    show: boolean;
    onToggle: () => void;
    error?: string;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
          {...register(name)}
          className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-800 pr-10
            focus:outline-none focus:ring-2 focus:ring-brand-500
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <PageHeader title="My Profile" description="Your account information and security settings" />

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={roleCls}>{formatRoleName(user.role)}</span>
              {user.status === 'ACTIVE'
                ? <span className="badge-active">Active</span>
                : <span className="badge-inactive">Inactive</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
          {[
            { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user.email },
            { icon: <Phone className="w-4 h-4" />, label: 'Mobile', value: user.phone ?? '—' },
            { icon: <Shield className="w-4 h-4" />, label: 'Role', value: formatRoleName(user.role) },
            { icon: <Hash className="w-4 h-4" />, label: 'Employee Code', value: user.employeeCode ?? '—' },
            { icon: <Lock className="w-4 h-4" />, label: 'Account Status', value: user.status },
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
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-navy-900 mb-1">Change Password</h2>
        <p className="text-sm text-slate-500 mb-5">
          Use a strong password with at least 10 characters.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <PasswordField
            id="current-password"
            label="Current Password"
            name="currentPassword"
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            error={errors.currentPassword?.message}
          />
          <PasswordField
            id="new-password"
            label="New Password"
            name="newPassword"
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            error={errors.newPassword?.message}
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirm New Password"
            name="confirmPassword"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirmPassword?.message}
          />

          <div className="pt-1">
            <ul className="text-xs text-slate-500 space-y-0.5 mb-4">
              <li>• At least 10 characters</li>
              <li>• One uppercase, one lowercase, one digit, one special character</li>
            </ul>
            <Button type="submit" isLoading={isSubmitting} id="change-password-btn">
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

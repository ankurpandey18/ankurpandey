import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ForceChangePasswordSchema, type ForceChangePasswordInput } from '@medstore/shared';
import { useAuth } from '../context/AuthContext';
import { authApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui';

export function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { success, error: showError } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForceChangePasswordInput>({
    resolver: zodResolver(ForceChangePasswordSchema),
  });

  const onSubmit = async (data: ForceChangePasswordInput) => {
    try {
      await authApi.forceChangePassword(data);
      await refresh();
      success('Password set', 'Your new password is active. Welcome!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to set password';
      showError('Failed', msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Warning notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Password Change Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your administrator has set a temporary password. You must create a new secure password before continuing.
            </p>
          </div>
        </div>

        <div className="card p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-navy-900">Set New Password</h1>
              <p className="text-xs text-slate-500">Create your secure password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="force-new-password" className="text-sm font-medium text-slate-700">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="force-new-password"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  {...register('newPassword')}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500
                    ${errors.newPassword ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showNew ? 'Hide' : 'Show'}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="force-confirm-password" className="text-sm font-medium text-slate-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="force-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500
                    ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirm ? 'Hide' : 'Show'}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <ul className="text-xs text-slate-500 space-y-0.5 mt-1">
              <li>• At least 10 characters</li>
              <li>• One uppercase, one lowercase</li>
              <li>• One digit, one special character</li>
            </ul>

            <Button type="submit" isLoading={isSubmitting} className="w-full" id="force-change-password-btn">
              Set Password & Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Unauthorized page ────────────────────────────────────────────────────────
export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-navy-900">Access Denied</h1>
        <p className="text-sm text-slate-500 mt-2">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Button className="mt-6" onClick={() => navigate('/dashboard')} id="back-to-dashboard">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── Not found page ───────────────────────────────────────────────────────────
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="text-7xl font-black text-slate-200 mb-4">404</div>
        <h1 className="text-xl font-bold text-navy-900">Page Not Found</h1>
        <p className="text-sm text-slate-500 mt-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button className="mt-6" onClick={() => navigate('/dashboard')} id="go-home">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

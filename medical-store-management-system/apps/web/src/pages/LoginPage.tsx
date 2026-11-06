import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Building2, Shield } from 'lucide-react';
import { LoginSchema, type LoginInput } from '@medstore/shared';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input } from '../components/ui';
import { ApiClientError } from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { error: showError, success } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
      success('Welcome back!', 'You have been signed in successfully.');
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 429) {
          showError('Too many attempts', 'Please wait before trying again.');
        } else {
          showError('Sign in failed', err.message);
        }
      } else {
        showError('Sign in failed', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-brand-50 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30 mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900">MedStore Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Medical Store Management System</p>
        </div>

        {/* Login card */}
        <div className="card p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-navy-900">Staff Sign In</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              required
              error={errors.email?.message}
              {...register('email')}
              id="login-email"
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                Password <span className="text-red-500" aria-hidden>*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  {...register('password')}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 pr-10
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow
                    ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
              id="login-submit"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Security notice */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Secured with encrypted session authentication</span>
        </div>
      </div>
    </div>
  );
}

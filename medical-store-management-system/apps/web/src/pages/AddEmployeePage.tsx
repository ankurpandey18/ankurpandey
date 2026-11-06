import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { CreateEmployeeSchema, type CreateEmployeeInput } from '@medstore/shared';
import { employeesApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, PageHeader } from '../components/ui';

export function AddEmployeePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: { role: 'PHARMACIST' },
  });

  const onSubmit = async (data: CreateEmployeeInput) => {
    try {
      const emp = await employeesApi.create(data);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      success('Employee created', `${emp.name} has been added to the system.`);
      navigate(`/employees/${emp.id}`);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create employee';
      showError('Failed', msg);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader
          title="Add Employee"
          description="Create a new employee account with temporary credentials"
        />
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              required
              autoFocus
              error={errors.name?.message}
              {...register('name')}
              id="emp-name"
            />
            <Input
              label="Email Address"
              type="email"
              required
              error={errors.email?.message}
              {...register('email')}
              id="emp-email"
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="10-digit mobile"
              error={errors.phone?.message}
              {...register('phone')}
              hint="10-digit Indian mobile number"
              id="emp-phone"
            />
            <Input
              label="Employee Code"
              required
              placeholder="e.g. EMP002"
              error={errors.employeeCode?.message}
              {...register('employeeCode')}
              id="emp-code"
            />
            <Select
              label="Role"
              required
              error={errors.role?.message}
              options={[
                { value: 'OWNER', label: 'Owner' },
                { value: 'PHARMACIST', label: 'Pharmacist' },
                { value: 'BILLING_STAFF', label: 'Billing Staff' },
              ]}
              {...register('role')}
              id="emp-role"
            />
            <Input
              label="Joining Date"
              type="date"
              error={errors.joiningDate?.message}
              {...register('joiningDate')}
              id="emp-joining"
            />
          </div>

          {/* Temporary password */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Temporary Password
            </h3>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emp-password" className="text-sm font-medium text-slate-700">
                Password
                <span className="text-xs font-normal text-slate-500 ml-2">
                  (leave blank to auto-generate)
                </span>
              </label>
              <div className="relative">
                <input
                  id="emp-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 10 chars, upper+lower+digit+special"
                  {...register('temporaryPassword')}
                  className={`block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 pr-10
                    focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.temporaryPassword && (
                <p className="text-xs text-red-600">{errors.temporaryPassword.message}</p>
              )}
              <p className="text-xs text-slate-500">
                The employee must change this password on first login.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting} id="create-employee-btn">
              Create Employee
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/employees')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

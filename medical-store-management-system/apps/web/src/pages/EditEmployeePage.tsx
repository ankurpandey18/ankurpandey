import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { UpdateEmployeeSchema, type UpdateEmployeeInput } from '@medstore/shared';
import { employeesApi, ApiClientError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select, PageHeader, Skeleton } from '../components/ui';

export function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(UpdateEmployeeSchema),
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        phone: employee.phone ?? '',
        employeeCode: employee.employeeCode,
        role: employee.role,
        joiningDate: employee.joiningDate
          ? new Date(employee.joiningDate).toISOString().split('T')[0]
          : '',
      });
    }
  }, [employee, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateEmployeeInput) => employeesApi.update(id!, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      success('Employee updated', `${updated.name}'s information has been saved.`);
      navigate(`/employees/${id}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Update failed';
      showError('Failed', msg);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="card p-6 grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/employees/${id}`)}
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader
          title="Edit Employee"
          description={`Updating profile for ${employee?.name ?? '…'}`}
        />
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Full Name"
              required
              error={errors.name?.message}
              {...register('name')}
              id="edit-name"
            />
            <Input
              label="Mobile Number"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
              id="edit-phone"
            />
            <Input
              label="Employee Code"
              required
              error={errors.employeeCode?.message}
              {...register('employeeCode')}
              id="edit-code"
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
              id="edit-role"
            />
            <Input
              label="Joining Date"
              type="date"
              error={errors.joiningDate?.message}
              {...register('joiningDate')}
              id="edit-joining"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting || mutation.isPending}
              disabled={!isDirty}
              id="save-employee-btn"
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/employees/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

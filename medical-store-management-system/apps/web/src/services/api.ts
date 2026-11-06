/**
 * Centralized API client.
 * All requests go through here — consistent error handling, credentials, base URL.
 */

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorData = data as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    throw new ApiClientError(
      errorData?.error?.code ?? 'UNKNOWN_ERROR',
      errorData?.error?.message ?? 'An unexpected error occurred',
      response.status,
      errorData?.error?.details,
    );
  }

  return (data as { data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
import type { UserDto, EmployeeDto, Paginated } from '@medstore/shared';
import type {
  LoginInput,
  ChangePasswordInput,
  ForceChangePasswordInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeListQuery,
  AuditListQuery,
} from '@medstore/shared';

export const authApi = {
  login: (body: LoginInput) => api.post<UserDto>('/auth/login', body),
  logout: () => api.post<null>('/auth/logout'),
  me: () => api.get<UserDto>('/auth/me'),
  changePassword: (body: ChangePasswordInput) =>
    api.post<null>('/auth/change-password', body),
  forceChangePassword: (body: ForceChangePasswordInput) =>
    api.post<null>('/auth/force-change-password', body),
};

export const employeesApi = {
  list: (query?: Partial<EmployeeListQuery>) => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.search) params.set('search', query.search);
    if (query?.role) params.set('role', query.role);
    if (query?.status) params.set('status', query.status);
    return api.get<Paginated<EmployeeDto>>(`/employees?${params.toString()}`);
  },
  get: (id: string) => api.get<EmployeeDto>(`/employees/${id}`),
  create: (body: CreateEmployeeInput) => api.post<EmployeeDto>('/employees', body),
  update: (id: string, body: UpdateEmployeeInput) =>
    api.patch<EmployeeDto>(`/employees/${id}`, body),
  activate: (id: string) => api.post<EmployeeDto>(`/employees/${id}/activate`),
  deactivate: (id: string) => api.post<EmployeeDto>(`/employees/${id}/deactivate`),
  resetPassword: (id: string, temporaryPassword: string) =>
    api.post<null>(`/employees/${id}/reset-password`, { temporaryPassword }),
};

export const dashboardApi = {
  owner: () => api.get<unknown>('/dashboard/owner'),
  pharmacist: () => api.get<unknown>('/dashboard/pharmacist'),
  billingStaff: () => api.get<unknown>('/dashboard/billing-staff'),
};

export const auditApi = {
  list: (query?: Partial<AuditListQuery>) => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.action) params.set('action', query.action);
    if (query?.actorId) params.set('actorId', query.actorId);
    if (query?.startDate) params.set('startDate', query.startDate);
    if (query?.endDate) params.set('endDate', query.endDate);
    return api.get<unknown>(`/audit?${params.toString()}`);
  },
  get: (id: string) => api.get<unknown>(`/audit/${id}`),
};

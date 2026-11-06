import { z } from 'zod';

// ─── Role enum ───────────────────────────────────────────────────────────────
export const RoleEnum = z.enum(['OWNER', 'PHARMACIST', 'BILLING_STAFF']);
export type Role = z.infer<typeof RoleEnum>;

// ─── Account status enum ──────────────────────────────────────────────────────
export const AccountStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
export type AccountStatus = z.infer<typeof AccountStatusEnum>;

// ─── Permission keys ──────────────────────────────────────────────────────────
export const PermissionKey = {
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_WRITE: 'employees:write',
  EMPLOYEES_DEACTIVATE: 'employees:deactivate',
  ROLES_ASSIGN: 'roles:assign',
  AUDIT_READ: 'audit:read',
  DASHBOARD_OWNER: 'dashboard:owner',
  DASHBOARD_PHARMACIST: 'dashboard:pharmacist',
  DASHBOARD_BILLING: 'dashboard:billing',
  USERS_READ_OWN: 'users:read-own',
  USERS_WRITE_OWN: 'users:write-own',
  SESSIONS_REVOKE: 'sessions:revoke',
} as const;

export type PermissionKeyType = (typeof PermissionKey)[keyof typeof PermissionKey];

// ─── Role → Permissions mapping ───────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, PermissionKeyType[]> = {
  OWNER: [
    PermissionKey.EMPLOYEES_READ,
    PermissionKey.EMPLOYEES_WRITE,
    PermissionKey.EMPLOYEES_DEACTIVATE,
    PermissionKey.ROLES_ASSIGN,
    PermissionKey.AUDIT_READ,
    PermissionKey.DASHBOARD_OWNER,
    PermissionKey.USERS_READ_OWN,
    PermissionKey.USERS_WRITE_OWN,
    PermissionKey.SESSIONS_REVOKE,
  ],
  PHARMACIST: [
    PermissionKey.DASHBOARD_PHARMACIST,
    PermissionKey.USERS_READ_OWN,
    PermissionKey.USERS_WRITE_OWN,
  ],
  BILLING_STAFF: [
    PermissionKey.DASHBOARD_BILLING,
    PermissionKey.USERS_READ_OWN,
    PermissionKey.USERS_WRITE_OWN,
  ],
};

// ─── API Response shapes ──────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Auth schemas ─────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ForceChangePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ForceChangePasswordInput = z.infer<typeof ForceChangePasswordSchema>;

// ─── Employee schemas ─────────────────────────────────────────────────────────
const DateStringSchema = z
  .string()
  .refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid date format (e.g. YYYY-MM-DD)',
  })
  .optional()
  .or(z.literal(''));

export const CreateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .optional()
    .or(z.literal('')),
  employeeCode: z.string().min(2).max(20).trim().toUpperCase(),
  role: RoleEnum,
  joiningDate: DateStringSchema,
  temporaryPassword: z
    .string()
    .min(10, 'Temporary password must be at least 10 characters')
    .optional()
    .or(z.literal('')),
});
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .optional()
    .or(z.literal('')),
  employeeCode: z.string().min(2).max(20).trim().toUpperCase().optional(),
  role: RoleEnum.optional(),
  joiningDate: DateStringSchema,
});
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

export const ResetPasswordSchema = z.object({
  temporaryPassword: z
    .string()
    .min(10, 'Temporary password must be at least 10 characters'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ─── Employee list query ──────────────────────────────────────────────────────
export const EmployeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: RoleEnum.optional(),
  status: AccountStatusEnum.optional(),
});
export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

// ─── Audit log query ──────────────────────────────────────────────────────────
export const AuditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type AuditListQuery = z.infer<typeof AuditListQuerySchema>;

// ─── Audit actions enum ───────────────────────────────────────────────────────
export const AuditAction = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMPLOYEE_CREATED: 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
  EMPLOYEE_ACTIVATED: 'EMPLOYEE_ACTIVATED',
  EMPLOYEE_DEACTIVATED: 'EMPLOYEE_DEACTIVATED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  FORCE_PASSWORD_CHANGE: 'FORCE_PASSWORD_CHANGE',
} as const;
export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// ─── User DTO (safe — no password hash) ──────────────────────────────────────
export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  mustChangePassword: boolean;
  lastLogin: string | null;
  role: Role;
  employeeCode: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Employee DTO ─────────────────────────────────────────────────────────────
export interface EmployeeDto extends UserDto {
  employeeCode: string;
  joiningDate: string | null;
}

// ─── Paginated response ───────────────────────────────────────────────────────
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

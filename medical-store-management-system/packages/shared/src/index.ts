import { z } from 'zod';

// ─── Role enum ───────────────────────────────────────────────────────────────
export const RoleEnum = z.enum(['OWNER', 'PHARMACIST', 'BILLING_STAFF']);
export type Role = z.infer<typeof RoleEnum>;

// ─── Account status enum ──────────────────────────────────────────────────────
export const AccountStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
export type AccountStatus = z.infer<typeof AccountStatusEnum>;

// ─── Phase 2 Enums ────────────────────────────────────────────────────────────
export const PackagingTypeEnum = z.enum(['BASE_UNIT', 'PACK']);
export type PackagingType = z.infer<typeof PackagingTypeEnum>;
export const PackagingType = {
  BASE_UNIT: 'BASE_UNIT',
  PACK: 'PACK',
} as const;

export const BatchStatusEnum = z.enum(['ACTIVE', 'QUARANTINED', 'EXPIRED', 'DEPLETED']);
export type BatchStatus = z.infer<typeof BatchStatusEnum>;
export const BatchStatus = {
  ACTIVE: 'ACTIVE',
  QUARANTINED: 'QUARANTINED',
  EXPIRED: 'EXPIRED',
  DEPLETED: 'DEPLETED',
} as const;

export const LocationTypeEnum = z.enum(['MAIN_STORE', 'RACK', 'SHELF', 'CABINET', 'REFRIGERATOR']);
export type LocationType = z.infer<typeof LocationTypeEnum>;
export const LocationType = {
  MAIN_STORE: 'MAIN_STORE',
  RACK: 'RACK',
  SHELF: 'SHELF',
  CABINET: 'CABINET',
  REFRIGERATOR: 'REFRIGERATOR',
} as const;

export const OperationTypeEnum = z.enum(['OPENING_STOCK', 'ADJUSTMENT', 'TRANSFER', 'STOCK_COUNT']);
export type OperationType = z.infer<typeof OperationTypeEnum>;
export const OperationType = {
  OPENING_STOCK: 'OPENING_STOCK',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  STOCK_COUNT: 'STOCK_COUNT',
} as const;

export const OperationStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED']);
export type OperationStatus = z.infer<typeof OperationStatusEnum>;
export const OperationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  POSTED: 'POSTED',
} as const;

export const MovementTypeEnum = z.enum([
  'OPENING_STOCK',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'DAMAGE',
  'EXPIRED',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'STOCK_COUNT_VARIANCE',
]);
export type MovementType = z.infer<typeof MovementTypeEnum>;
export const MovementType = {
  OPENING_STOCK: 'OPENING_STOCK',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  DAMAGE: 'DAMAGE',
  EXPIRED: 'EXPIRED',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  STOCK_COUNT_VARIANCE: 'STOCK_COUNT_VARIANCE',
} as const;

// ─── Permission keys ──────────────────────────────────────────────────────────
export const PermissionKey = {
  // Phase 1
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

  // Phase 2: Medicine Catalogue
  MEDICINES_READ: 'medicines:read',
  MEDICINES_WRITE: 'medicines:write',
  MEDICINES_DEACTIVATE: 'medicines:deactivate',
  MASTER_DATA_READ: 'master-data:read',
  MASTER_DATA_WRITE: 'master-data:write',

  // Phase 2: Batches
  BATCHES_READ: 'batches:read',
  BATCHES_WRITE: 'batches:write',

  // Phase 2: Inventory & Operations
  INVENTORY_READ: 'inventory:read',
  OPENING_STOCK_CREATE: 'opening-stock:create',
  OPENING_STOCK_APPROVE: 'opening-stock:approve',
  ADJUSTMENTS_CREATE: 'adjustments:create',
  ADJUSTMENTS_APPROVE: 'adjustments:approve',
  TRANSFERS_CREATE: 'transfers:create',
  STOCK_COUNTS_CREATE: 'stock-counts:create',
  STOCK_COUNTS_APPROVE: 'stock-counts:approve',

  // Phase 2: Reports & Tools
  REPORTS_READ: 'reports:read',
  IMPORT_EXPORT_MANAGE: 'import-export:manage',
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
    PermissionKey.MEDICINES_READ,
    PermissionKey.MEDICINES_WRITE,
    PermissionKey.MEDICINES_DEACTIVATE,
    PermissionKey.MASTER_DATA_READ,
    PermissionKey.MASTER_DATA_WRITE,
    PermissionKey.BATCHES_READ,
    PermissionKey.BATCHES_WRITE,
    PermissionKey.INVENTORY_READ,
    PermissionKey.OPENING_STOCK_CREATE,
    PermissionKey.OPENING_STOCK_APPROVE,
    PermissionKey.ADJUSTMENTS_CREATE,
    PermissionKey.ADJUSTMENTS_APPROVE,
    PermissionKey.TRANSFERS_CREATE,
    PermissionKey.STOCK_COUNTS_CREATE,
    PermissionKey.STOCK_COUNTS_APPROVE,
    PermissionKey.REPORTS_READ,
    PermissionKey.IMPORT_EXPORT_MANAGE,
  ],
  PHARMACIST: [
    PermissionKey.DASHBOARD_PHARMACIST,
    PermissionKey.USERS_READ_OWN,
    PermissionKey.USERS_WRITE_OWN,
    PermissionKey.MEDICINES_READ,
    PermissionKey.MEDICINES_WRITE,
    PermissionKey.MASTER_DATA_READ,
    PermissionKey.BATCHES_READ,
    PermissionKey.BATCHES_WRITE,
    PermissionKey.INVENTORY_READ,
    PermissionKey.OPENING_STOCK_CREATE,
    PermissionKey.ADJUSTMENTS_CREATE,
    PermissionKey.TRANSFERS_CREATE,
    PermissionKey.STOCK_COUNTS_CREATE,
    PermissionKey.REPORTS_READ,
  ],
  BILLING_STAFF: [
    PermissionKey.DASHBOARD_BILLING,
    PermissionKey.USERS_READ_OWN,
    PermissionKey.USERS_WRITE_OWN,
    PermissionKey.MEDICINES_READ,
    PermissionKey.BATCHES_READ,
    PermissionKey.INVENTORY_READ,
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

  // Phase 2 Audit Actions
  MEDICINE_CREATED: 'MEDICINE_CREATED',
  MEDICINE_UPDATED: 'MEDICINE_UPDATED',
  MEDICINE_DEACTIVATED: 'MEDICINE_DEACTIVATED',
  BATCH_CREATED: 'BATCH_CREATED',
  BATCH_UPDATED: 'BATCH_UPDATED',
  OPENING_STOCK_SUBMITTED: 'OPENING_STOCK_SUBMITTED',
  OPENING_STOCK_APPROVED: 'OPENING_STOCK_APPROVED',
  OPENING_STOCK_POSTED: 'OPENING_STOCK_POSTED',
  ADJUSTMENT_SUBMITTED: 'ADJUSTMENT_SUBMITTED',
  ADJUSTMENT_APPROVED: 'ADJUSTMENT_APPROVED',
  ADJUSTMENT_REJECTED: 'ADJUSTMENT_REJECTED',
  ADJUSTMENT_POSTED: 'ADJUSTMENT_POSTED',
  TRANSFER_CREATED: 'TRANSFER_CREATED',
  TRANSFER_POSTED: 'TRANSFER_POSTED',
  STOCK_COUNT_SUBMITTED: 'STOCK_COUNT_SUBMITTED',
  STOCK_COUNT_APPROVED: 'STOCK_COUNT_APPROVED',
  STOCK_COUNT_POSTED: 'STOCK_COUNT_POSTED',
  DATA_IMPORTED: 'DATA_IMPORTED',
  DATA_EXPORTED: 'DATA_EXPORTED',
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

// ==============================================================================
// PHASE 2 SCHEMAS & DTOS
// ==============================================================================

// ─── Master Data: Category ────────────────────────────────────────────────────
export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
  description: z.string().max(255).optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export interface CategoryDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Master Data: Manufacturer ────────────────────────────────────────────────
export const CreateManufacturerSchema = z.object({
  name: z.string().min(2).max(150).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().optional(),
});
export type CreateManufacturerInput = z.infer<typeof CreateManufacturerSchema>;

export const UpdateManufacturerSchema = CreateManufacturerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateManufacturerInput = z.infer<typeof UpdateManufacturerSchema>;

export interface ManufacturerDto {
  id: number;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Master Data: DosageForm & Route ──────────────────────────────────────────
export const CreateDosageFormSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
  description: z.string().max(255).optional(),
});
export type CreateDosageFormInput = z.infer<typeof CreateDosageFormSchema>;

export interface DosageFormDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export const CreateAdministrationRouteSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
});
export type CreateAdministrationRouteInput = z.infer<typeof CreateAdministrationRouteSchema>;

export interface AdministrationRouteDto {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Master Data: MeasurementUnit & Composition ───────────────────────────────
export const CreateMeasurementUnitSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  symbol: z.string().min(1).max(20).trim(),
  description: z.string().max(100).optional(),
});
export type CreateMeasurementUnitInput = z.infer<typeof CreateMeasurementUnitSchema>;

export interface MeasurementUnitDto {
  id: number;
  name: string;
  symbol: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export const CreateCompositionSchema = z.object({
  name: z.string().min(2).max(150).trim(),
  description: z.string().optional(),
});
export type CreateCompositionInput = z.infer<typeof CreateCompositionSchema>;

export interface CompositionDto {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Medicine Catalogue ───────────────────────────────────────────────────────
export const MedicineCompositionInputSchema = z.object({
  compositionId: z.number().int().positive(),
  strengthValue: z.coerce.number().positive().optional(),
  unitId: z.number().int().positive().optional(),
});
export type MedicineCompositionInput = z.infer<typeof MedicineCompositionInputSchema>;

export const CreateMedicineSchema = z.object({
  sku: z.string().min(2).max(50).trim().toUpperCase(),
  brandName: z.string().min(2).max(150).trim(),
  genericName: z.string().min(2).max(200).trim(),
  displayName: z.string().min(2).max(255).trim().optional(),
  categoryId: z.number().int().positive().optional(),
  manufacturerId: z.number().int().positive().optional(),
  dosageFormId: z.number().int().positive().optional(),
  administrationRouteId: z.number().int().positive().optional(),
  prescriptionRequired: z.boolean().default(false),
  regulatoryCategory: z.string().max(50).optional().default('GENERAL'),
  hsnCode: z.string().max(20).optional().or(z.literal('')),
  gstRate: z.coerce.number().min(0).max(100).default(12.00),
  baseUnit: z.string().min(1).max(30).default('TABLET'),
  packUnit: z.string().min(1).max(30).default('STRIP'),
  unitsPerPack: z.coerce.number().positive().default(10.00),
  minStockLevel: z.coerce.number().min(0).default(10.00),
  storageConditions: z.string().max(255).optional(),
  sideEffects: z.string().optional(),
  primaryBarcode: z.string().max(100).optional().or(z.literal('')),
  compositions: z.array(MedicineCompositionInputSchema).optional(),
});
export type CreateMedicineInput = z.infer<typeof CreateMedicineSchema>;

export const UpdateMedicineSchema = CreateMedicineSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateMedicineInput = z.infer<typeof UpdateMedicineSchema>;

export const MedicineListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  manufacturerId: z.coerce.number().int().optional(),
  dosageFormId: z.coerce.number().int().optional(),
  prescriptionRequired: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  barcode: z.string().optional(),
});
export type MedicineListQuery = z.infer<typeof MedicineListQuerySchema>;

export interface MedicineDto {
  id: string;
  sku: string;
  brandName: string;
  genericName: string;
  displayName: string;
  categoryId: number | null;
  category?: CategoryDto | null;
  manufacturerId: number | null;
  manufacturer?: ManufacturerDto | null;
  dosageFormId: number | null;
  dosageForm?: DosageFormDto | null;
  administrationRouteId: number | null;
  administrationRoute?: AdministrationRouteDto | null;
  prescriptionRequired: boolean;
  regulatoryCategory: string | null;
  hsnCode: string | null;
  gstRate: number;
  baseUnit: string;
  packUnit: string;
  unitsPerPack: number;
  minStockLevel: number;
  storageConditions: string | null;
  sideEffects: string | null;
  isActive: boolean;
  totalStock?: number;
  compositions?: {
    id: number;
    compositionId: number;
    compositionName: string;
    strengthValue: number | null;
    unitSymbol: string | null;
  }[];
  barcodes?: {
    id: number;
    barcode: string;
    packagingType: PackagingType;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Batches ──────────────────────────────────────────────────────────────────
export const CreateBatchSchema = z
  .object({
    medicineId: z.string().uuid(),
    batchNumber: z.string().min(1).max(100).trim().toUpperCase(),
    manufacturingDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid manufacturing date'),
    expiryDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid expiry date'),
    mrp: z.coerce.number().min(0, 'MRP must be non-negative'),
    purchasePrice: z.coerce.number().min(0, 'Purchase price must be non-negative'),
    sellingPrice: z.coerce.number().min(0, 'Selling price must be non-negative'),
    packConversionFactor: z.coerce.number().positive().default(1.00),
    status: BatchStatusEnum.default('ACTIVE'),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.manufacturingDate) <= new Date(data.expiryDate), {
    message: 'Manufacturing date cannot be after expiry date',
    path: ['expiryDate'],
  });
export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = z.object({
  status: BatchStatusEnum.optional(),
  mrp: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
export type UpdateBatchInput = z.infer<typeof UpdateBatchSchema>;

export const BatchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  medicineId: z.string().uuid().optional(),
  search: z.string().optional(),
  status: BatchStatusEnum.optional(),
  expiryFilter: z.enum(['expired', '30days', '60days', '90days', 'all']).optional(),
});
export type BatchListQuery = z.infer<typeof BatchListQuerySchema>;

export interface BatchDto {
  id: string;
  medicineId: string;
  medicineName?: string;
  medicineSku?: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  packConversionFactor: number;
  status: BatchStatus;
  notes: string | null;
  totalStock?: number;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Locations ──────────────────────────────────────────────────────────
export const CreateStockLocationSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(50).trim().toUpperCase(),
  type: LocationTypeEnum.default('RACK'),
  description: z.string().max(255).optional(),
  parentId: z.string().uuid().optional(),
});
export type CreateStockLocationInput = z.infer<typeof CreateStockLocationSchema>;

export const UpdateStockLocationSchema = CreateStockLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateStockLocationInput = z.infer<typeof UpdateStockLocationSchema>;

export interface StockLocationDto {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  description: string | null;
  parentId: string | null;
  parentName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Balances ───────────────────────────────────────────────────────────
export interface StockBalanceDto {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineSku: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  quantityOnHand: number;
  reorderThreshold: number;
  lastMovementAt: string | null;
  daysRemaining: number;
  batchStatus: BatchStatus;
}

// ─── Stock Operations (Opening Stock, Adjustments, Transfers) ──────────────────
export const StockOperationItemInputSchema = z.object({
  medicineId: z.string().uuid(),
  batchId: z.string().uuid().optional(), // optional if new batch created in opening stock
  batchNumber: z.string().optional(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string().optional(),
  mrp: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  sourceLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0).optional(),
  reason: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});
export type StockOperationItemInput = z.infer<typeof StockOperationItemInputSchema>;

export const CreateOpeningStockSchema = z.object({
  locationId: z.string().uuid().optional(),
  items: z.array(StockOperationItemInputSchema).min(1, 'At least one item required'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateOpeningStockInput = z.infer<typeof CreateOpeningStockSchema>;

export const CreateAdjustmentSchema = z.object({
  batchId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustmentType: z.enum(['INCREASE', 'DECREASE', 'DAMAGE', 'EXPIRED', 'CORRECTION']),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  reason: z.string().min(3).max(255),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateAdjustmentInput = z.infer<typeof CreateAdjustmentSchema>;

export const CreateTransferSchema = z.object({
  batchId: z.string().uuid(),
  sourceLocationId: z.string().uuid(),
  destinationLocationId: z.string().uuid(),
  quantity: z.coerce.number().positive('Transfer quantity must be positive'),
  reason: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

export const OperationDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
});
export type OperationDecisionInput = z.infer<typeof OperationDecisionSchema>;

export interface StockOperationDto {
  id: string;
  operationNumber: string;
  type: OperationType;
  status: OperationStatus;
  requestedById: string | null;
  requestedByName?: string | null;
  approvedById: string | null;
  approvedByName?: string | null;
  notes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    sourceLocationId: string | null;
    sourceLocationName?: string | null;
    destinationLocationId: string | null;
    destinationLocationName?: string | null;
    quantity: number;
    unitPrice: number | null;
    reason: string | null;
  }[];
}

// ─── Stock Movement (Ledger) ──────────────────────────────────────────────────
export const StockLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  medicineId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  movementType: MovementTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type StockLedgerQuery = z.infer<typeof StockLedgerQuerySchema>;

export interface StockMovementDto {
  id: string;
  batchId: string;
  batchNumber: string;
  medicineName: string;
  locationId: string;
  locationName: string;
  operationId: string | null;
  operationNumber: string | null;
  movementType: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceDoc: string | null;
  reason: string | null;
  createdByName: string | null;
  createdAt: string;
}

// ─── Stock Count Sessions ─────────────────────────────────────────────────────
export const CreateStockCountSessionSchema = z.object({
  locationId: z.string().uuid(),
  notes: z.string().optional(),
});
export type CreateStockCountSessionInput = z.infer<typeof CreateStockCountSessionSchema>;

export const RecordStockCountItemSchema = z.object({
  items: z.array(
    z.object({
      medicineId: z.string().uuid(),
      batchId: z.string().uuid(),
      countedQuantity: z.coerce.number().min(0),
      notes: z.string().optional(),
    }),
  ),
});
export type RecordStockCountItemInput = z.infer<typeof RecordStockCountItemSchema>;

export interface StockCountSessionDto {
  id: string;
  sessionNumber: string;
  locationId: string;
  locationName: string;
  status: OperationStatus;
  createdByName: string | null;
  approvedByName: string | null;
  notes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  items: {
    id: string;
    medicineId: string;
    medicineName: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    systemQuantity: number;
    countedQuantity: number;
    varianceQuantity: number;
    notes: string | null;
  }[];
}

// ─── FEFO Engine ──────────────────────────────────────────────────────────────
export const FefoPreviewQuerySchema = z.object({
  medicineId: z.string().uuid(),
  requestedQuantity: z.coerce.number().positive(),
});
export type FefoPreviewQuery = z.infer<typeof FefoPreviewQuerySchema>;

export interface FefoAllocationItemDto {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  sellingPrice: number;
  availableQuantity: number;
  allocatedQuantity: number;
  remainingBatchStock: number;
  daysToExpiry: number;
  locationId: string;
  locationName: string;
}

export interface FefoPreviewResultDto {
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  totalAllocatedQuantity: number;
  shortageQuantity: number;
  isFullyAllocated: boolean;
  allocations: FefoAllocationItemDto[];
}

// ─── Reports DTOs ─────────────────────────────────────────────────────────────
export interface LowStockReportItemDto {
  medicineId: string;
  brandName: string;
  genericName: string;
  sku: string;
  categoryName: string | null;
  minStockLevel: number;
  totalStock: number;
  deficitQuantity: number;
  activeBatchesCount: number;
}

export interface ExpiryReportItemDto {
  batchId: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  sku: string;
  locationName: string;
  quantityOnHand: number;
  purchaseCost: number;
  totalValue: number;
  manufacturingDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90' | 'BEYOND_90';
}

export interface InventoryValuationDto {
  totalMedicines: number;
  totalBatches: number;
  totalQuantity: number;
  totalPurchaseValue: number;
  totalMrpValue: number;
}

/**
 * Normalizes manufacturer MM/YYYY labels into their final calendar date YYYY-MM-DD.
 * e.g., '02/2028' -> '2028-02-29' (leap year), '04/2026' -> '2026-04-30'.
 * In pharmaceutical ERP policy, expiry marked MM/YYYY is valid until the end of that calendar month.
 */
export function parseDateLabelToCalendarEnd(label: string): string {
  const trimmed = label.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid month/year format '${label}'. Expected MM/YYYY or YYYY-MM-DD.`);
  }
  const month = parseInt(match[1]!, 10);
  const year = parseInt(match[2]!, 10);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}


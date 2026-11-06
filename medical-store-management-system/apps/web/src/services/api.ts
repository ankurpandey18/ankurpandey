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

// ─── Phase 2 API Services ─────────────────────────────────────────────────────
import type {
  CategoryDto,
  ManufacturerDto,
  DosageFormDto,
  AdministrationRouteDto,
  MeasurementUnitDto,
  CompositionDto,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateManufacturerInput,
  UpdateManufacturerInput,
  MedicineDto,
  CreateMedicineInput,
  UpdateMedicineInput,
  MedicineListQuery,
  BatchDto,
  CreateBatchInput,
  UpdateBatchInput,
  BatchListQuery,
  StockLocationDto,
  CreateStockLocationInput,
  UpdateStockLocationInput,
  StockBalanceDto,
  StockMovementDto,
  StockOperationDto,
  CreateOpeningStockInput,
  CreateAdjustmentInput,
  CreateTransferInput,
  OperationDecisionInput,
  StockCountSessionDto,
  CreateStockCountSessionInput,
  RecordStockCountItemInput,
  FefoPreviewResultDto,
  ExpiryReportItemDto,
  LowStockReportItemDto,
  InventoryValuationDto,
  StockLedgerQuery,
} from '@medstore/shared';

export const masterDataApi = {
  categories: (includeInactive = false) =>
    api.get<CategoryDto[]>(`/categories?includeInactive=${includeInactive}`),
  createCategory: (body: CreateCategoryInput) =>
    api.post<CategoryDto>('/categories', body),
  updateCategory: (id: number, body: UpdateCategoryInput) =>
    api.patch<CategoryDto>(`/categories/${id}`, body),

  manufacturers: (includeInactive = false) =>
    api.get<ManufacturerDto[]>(`/manufacturers?includeInactive=${includeInactive}`),
  createManufacturer: (body: CreateManufacturerInput) =>
    api.post<ManufacturerDto>('/manufacturers', body),
  updateManufacturer: (id: number, body: UpdateManufacturerInput) =>
    api.patch<ManufacturerDto>(`/manufacturers/${id}`, body),

  dosageForms: () => api.get<DosageFormDto[]>('/dosage-forms'),
  administrationRoutes: () => api.get<AdministrationRouteDto[]>('/administration-routes'),
  units: () => api.get<MeasurementUnitDto[]>('/units'),
  compositions: (search?: string) =>
    api.get<CompositionDto[]>(`/compositions${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createComposition: (body: { name: string; description?: string }) =>
    api.post<CompositionDto>('/compositions', body),
};

export const medicinesApi = {
  list: (query?: Partial<MedicineListQuery>) => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.search) params.set('search', query.search);
    if (query?.categoryId) params.set('categoryId', String(query.categoryId));
    if (query?.manufacturerId) params.set('manufacturerId', String(query.manufacturerId));
    if (query?.dosageFormId) params.set('dosageFormId', String(query.dosageFormId));
    if (query?.prescriptionRequired !== undefined)
      params.set('prescriptionRequired', String(query.prescriptionRequired));
    if (query?.isActive !== undefined) params.set('isActive', String(query.isActive));
    if (query?.barcode) params.set('barcode', query.barcode);
    return api.get<Paginated<MedicineDto>>(`/medicines?${params.toString()}`);
  },
  get: (id: string) => api.get<MedicineDto>(`/medicines/${id}`),
  create: (body: CreateMedicineInput) => api.post<MedicineDto>('/medicines', body),
  update: (id: string, body: UpdateMedicineInput) =>
    api.patch<MedicineDto>(`/medicines/${id}`, body),
  deactivate: (id: string) => api.post<MedicineDto>(`/medicines/${id}/deactivate`),
  addBarcode: (id: string, barcode: string, packagingType = 'BASE_UNIT') =>
    api.post<unknown>(`/medicines/${id}/barcodes`, { barcode, packagingType }),
};

export const batchesApi = {
  list: (query?: Partial<BatchListQuery>) => {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.medicineId) params.set('medicineId', query.medicineId);
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.expiryFilter) params.set('expiryFilter', query.expiryFilter);
    return api.get<Paginated<BatchDto>>(`/batches?${params.toString()}`);
  },
  get: (id: string) => api.get<BatchDto>(`/batches/${id}`),
  create: (body: CreateBatchInput) => api.post<BatchDto>('/batches', body),
  update: (id: string, body: UpdateBatchInput) =>
    api.patch<BatchDto>(`/batches/${id}`, body),
};

export const inventoryApi = {
  locations: (includeInactive = false) =>
    api.get<StockLocationDto[]>(`/inventory/locations?includeInactive=${includeInactive}`),
  createLocation: (body: CreateStockLocationInput) =>
    api.post<StockLocationDto>('/inventory/locations', body),
  updateLocation: (id: string, body: UpdateStockLocationInput) =>
    api.patch<StockLocationDto>(`/inventory/locations/${id}`, body),

  balances: (params?: {
    page?: number;
    limit?: number;
    medicineId?: string;
    batchId?: string;
    locationId?: string;
    search?: string;
    onlyAvailable?: boolean;
  }) => {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    if (params?.medicineId) p.set('medicineId', params.medicineId);
    if (params?.batchId) p.set('batchId', params.batchId);
    if (params?.locationId) p.set('locationId', params.locationId);
    if (params?.search) p.set('search', params.search);
    if (params?.onlyAvailable) p.set('onlyAvailable', 'true');
    return api.get<Paginated<StockBalanceDto>>(`/inventory/balances?${p.toString()}`);
  },

  ledger: (query?: Partial<StockLedgerQuery>) => {
    const p = new URLSearchParams();
    if (query?.page) p.set('page', String(query.page));
    if (query?.limit) p.set('limit', String(query.limit));
    if (query?.medicineId) p.set('medicineId', query.medicineId);
    if (query?.batchId) p.set('batchId', query.batchId);
    if (query?.locationId) p.set('locationId', query.locationId);
    if (query?.movementType) p.set('movementType', query.movementType);
    if (query?.startDate) p.set('startDate', query.startDate);
    if (query?.endDate) p.set('endDate', query.endDate);
    return api.get<Paginated<StockMovementDto>>(`/inventory/ledger?${p.toString()}`);
  },

  reconciliation: () => api.get<any>('/inventory/reconciliation'),

  operations: (params?: { type?: string; status?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.type) p.set('type', params.type);
    if (params?.status) p.set('status', params.status);
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    return api.get<Paginated<StockOperationDto>>(`/inventory/operations?${p.toString()}`);
  },
  getOperation: (id: string) => api.get<StockOperationDto>(`/inventory/operations/${id}`),

  createOpeningStock: (body: CreateOpeningStockInput) =>
    api.post<StockOperationDto>('/inventory/opening-stock', body),
  submitOpeningStock: (id: string) =>
    api.post<StockOperationDto>(`/inventory/opening-stock/${id}/submit`),
  approveOpeningStock: (id: string) =>
    api.post<StockOperationDto>(`/inventory/opening-stock/${id}/approve`),
  postOpeningStock: (id: string) =>
    api.post<StockOperationDto>(`/inventory/opening-stock/${id}/post`),

  createAdjustment: (body: CreateAdjustmentInput) =>
    api.post<StockOperationDto>('/inventory/adjustments', body),
  decideAdjustment: (id: string, body: OperationDecisionInput) =>
    api.post<StockOperationDto>(`/inventory/adjustments/${id}/decide`, body),
  postAdjustment: (id: string) =>
    api.post<StockOperationDto>(`/inventory/adjustments/${id}/post`),

  createTransfer: (body: CreateTransferInput) =>
    api.post<StockOperationDto>('/inventory/transfers', body),

  counts: (params?: { locationId?: string; status?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.locationId) p.set('locationId', params.locationId);
    if (params?.status) p.set('status', params.status);
    if (params?.page) p.set('page', String(params.page));
    if (params?.limit) p.set('limit', String(params.limit));
    return api.get<Paginated<StockCountSessionDto>>(`/inventory/counts?${p.toString()}`);
  },
  getCount: (id: string) => api.get<StockCountSessionDto>(`/inventory/counts/${id}`),
  createCount: (body: CreateStockCountSessionInput) =>
    api.post<StockCountSessionDto>('/inventory/counts', body),
  recordCountItems: (id: string, body: RecordStockCountItemInput) =>
    api.post<StockCountSessionDto>(`/inventory/counts/${id}/items`, body),
  submitCount: (id: string) =>
    api.post<StockCountSessionDto>(`/inventory/counts/${id}/submit`),
  decideCount: (id: string, body: OperationDecisionInput) =>
    api.post<StockCountSessionDto>(`/inventory/counts/${id}/decide`, body),
  postCount: (id: string) =>
    api.post<StockCountSessionDto>(`/inventory/counts/${id}/post`),
};

export const reportsApi = {
  expiry: (filter?: string) =>
    api.get<ExpiryReportItemDto[]>(`/reports/expiry${filter ? `?filter=${filter}` : ''}`),
  lowStock: (params?: { search?: string; categoryId?: number }) => {
    const p = new URLSearchParams();
    if (params?.search) p.set('search', params.search);
    if (params?.categoryId) p.set('categoryId', String(params.categoryId));
    return api.get<LowStockReportItemDto[]>(`/reports/low-stock?${p.toString()}`);
  },
  valuation: () => api.get<InventoryValuationDto>('/reports/valuation'),
  fefoPreview: (medicineId: string, requestedQuantity: number) =>
    api.get<FefoPreviewResultDto>(
      `/reports/fefo-preview?medicineId=${medicineId}&requestedQuantity=${requestedQuantity}`,
    ),
};

export const importsApi = {
  previewMedicines: (csvText: string) =>
    api.post<any>('/imports/medicines/preview', { csvText }),
  commitMedicines: (rows: any[]) =>
    api.post<{ success: boolean; importedCount: number }>('/imports/medicines/commit', { rows }),
  exportUrl: '/api/v1/imports/inventory/export',
};

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  PowerOff,
  Upload,
  Layers,
  Building2,
  FileText,
  AlertCircle,
  Pill,
} from 'lucide-react';
import { medicinesApi, masterDataApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  EmptyState,
  PageHeader,
  ConfirmDialog,
} from '../../components/ui';

export function MedicineListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [manufacturerId, setManufacturerId] = useState(searchParams.get('manufacturerId') ?? '');
  const [dosageFormId, setDosageFormId] = useState(searchParams.get('dosageFormId') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('isActive') ?? 'true');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const [deactivatingMedId, setDeactivatingMedId] = useState<string | null>(null);

  const canEdit = user?.role === 'OWNER' || user?.role === 'PHARMACIST';
  const isOwner = user?.role === 'OWNER';

  // Fetch Categories & Manufacturers for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['masterData', 'categories'],
    queryFn: () => masterDataApi.categories(false),
  });

  const { data: manufacturers = [] } = useQuery({
    queryKey: ['masterData', 'manufacturers'],
    queryFn: () => masterDataApi.manufacturers(false),
  });

  const { data: dosageForms = [] } = useQuery({
    queryKey: ['masterData', 'dosageForms'],
    queryFn: () => masterDataApi.dosageForms(),
  });

  // Query medicines
  const {
    data: medicineData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'medicines',
      {
        page,
        limit: 15,
        search: searchTerm,
        categoryId: categoryId ? Number(categoryId) : undefined,
        manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
        dosageFormId: dosageFormId ? Number(dosageFormId) : undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'true',
      },
    ],
    queryFn: () =>
      medicinesApi.list({
        page,
        limit: 15,
        search: searchTerm || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
        dosageFormId: dosageFormId ? Number(dosageFormId) : undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'true',
      }),
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => medicinesApi.deactivate(id),
    onSuccess: () => {
      success('Medicine status updated');
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setDeactivatingMedId(null);
    },
    onError: (err: any) => {
      toastError('Failed to change status', err.message || 'Operation failed');
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryId('');
    setManufacturerId('');
    setDosageFormId('');
    setStatusFilter('true');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Medicine Catalogue"
        description="Comprehensive master inventory and formulation directory"
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/master-data')}
                id="btn-master-data"
              >
                <Layers className="w-4 h-4" />
                Master Data
              </Button>
            )}
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/imports')}
                id="btn-import-medicines"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
            )}
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/medicines/new')}
                id="btn-add-medicine"
              >
                <Plus className="w-4 h-4" />
                Add Medicine
              </Button>
            )}
          </div>
        }
      />

      {/* Filter / Search Card */}
      <div className="card p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand name, generic name, SKU or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              id="input-medicine-search"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
              id="select-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={manufacturerId}
              onChange={(e) => {
                setManufacturerId(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
              id="select-manufacturer-filter"
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
              id="select-status-filter"
            >
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
              <option value="all">All Statuses</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Medicine Table Card */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">Failed to load medicines.</p>
            <p className="text-xs text-slate-500 mt-1">Please check server connection.</p>
          </div>
        ) : !medicineData?.items || medicineData.items.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-8 h-8" />}
            title="No medicines found"
            description="Try modifying search keywords or adding a new medicine to the catalogue."
            action={
              canEdit ? (
                <Button variant="primary" size="sm" onClick={() => navigate('/medicines/new')}>
                  <Plus className="w-4 h-4 mr-1" /> Add First Medicine
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">Brand & SKU</th>
                  <th className="py-3 px-4">Generic / Strength</th>
                  <th className="py-3 px-4">Category & Form</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Packaging</th>
                  <th className="py-3 px-4">Min Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicineData.items.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy-900">{med.brandName}</div>
                      <div className="text-xs text-slate-500 font-mono">{med.sku}</div>
                      {med.barcodes && med.barcodes.length > 0 && (
                        <div className="text-xs text-slate-400 font-mono">
                          BC: {med.barcodes[0]?.barcode}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{med.genericName}</div>
                      <div className="text-xs text-slate-500">{med.regulatoryCategory || 'GENERAL'}</div>
                      {med.prescriptionRequired && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Rx Required
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">{med.category?.name ?? '—'}</div>
                      <div className="text-xs text-slate-500">{med.dosageForm?.name ?? '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{med.manufacturer?.name ?? '—'}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 text-xs">
                        {med.unitsPerPack} {med.baseUnit} / {med.packUnit}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700">{med.minStockLevel}</span>
                    </td>
                    <td className="py-3 px-4">
                      {med.isActive ? (
                        <Badge variant="active">Active</Badge>
                      ) : (
                        <Badge variant="inactive">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/medicines/${med.id}`)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-brand-600 transition-colors"
                          title="View Details"
                          id={`btn-view-${med.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/medicines/${med.id}/edit`)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                            title="Edit Medicine"
                            id={`btn-edit-${med.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isOwner && med.isActive && (
                          <button
                            onClick={() => setDeactivatingMedId(med.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Deactivate Medicine"
                            id={`btn-deactivate-${med.id}`}
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {medicineData && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing {medicineData.items.length} of {medicineData.total} medicines
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="flex items-center px-2 font-medium">
                Page {page} of {medicineData.totalPages || 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= medicineData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={!!deactivatingMedId}
        title="Deactivate Medicine"
        message="Are you sure you want to deactivate this medicine? Deactivated medicines cannot receive new active batches or be dispensed."
        confirmLabel="Deactivate"
        onConfirm={() => deactivatingMedId && deactivateMutation.mutate(deactivatingMedId)}
        onCancel={() => setDeactivatingMedId(null)}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}

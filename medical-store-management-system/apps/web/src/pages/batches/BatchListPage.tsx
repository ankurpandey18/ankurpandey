import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  Pill,
  Clock,
  CheckCircle,
  Filter,
  X,
  Edit2,
  DollarSign,
} from 'lucide-react';
import { batchesApi, medicinesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input, Select, PageHeader, Spinner, EmptyState } from '../../components/ui';

export function BatchListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const initialMedId = searchParams.get('medicineId') ?? '';
  const initialAction = searchParams.get('action') ?? '';

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [selectedMedId, setSelectedMedId] = useState(initialMedId);
  const [expiryFilter, setExpiryFilter] = useState(searchParams.get('expiryFilter') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'ACTIVE');
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(initialAction === 'new');
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  const canManage = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  // Medicine list for dropdown
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines', { limit: 100, isActive: true }],
    queryFn: () => medicinesApi.list({ limit: 100, isActive: true }),
  });

  // Batches list query
  const {
    data: batchesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'batches',
      {
        page,
        limit: 15,
        search: searchTerm,
        medicineId: selectedMedId || undefined,
        expiryFilter: expiryFilter || undefined,
        status: statusFilter || undefined,
      },
    ],
    queryFn: () =>
      batchesApi.list({
        page,
        limit: 15,
        search: searchTerm || undefined,
        medicineId: selectedMedId || undefined,
        expiryFilter: (expiryFilter as any) || undefined,
        status: (statusFilter as any) || undefined,
      }),
  });

  // Create batch form state
  const [batchForm, setBatchForm] = useState({
    medicineId: initialMedId || '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    mrp: '',
    purchasePrice: '',
    sellingPrice: '',
    packConversionFactor: 1,
    notes: '',
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => batchesApi.create(body),
    onSuccess: () => {
      success('Batch created successfully');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setIsCreateOpen(false);
      setBatchForm({
        medicineId: selectedMedId || '',
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        mrp: '',
        purchasePrice: '',
        sellingPrice: '',
        packConversionFactor: 1,
        notes: '',
      });
    },
    onError: (err: any) => {
      toastError('Failed to create batch', err.message || 'Validation error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => batchesApi.update(id, body),
    onSuccess: () => {
      success('Batch updated successfully');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setEditingBatch(null);
    },
    onError: (err: any) => {
      toastError('Update failed', err.message || 'Error occurred');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.medicineId || !batchForm.batchNumber || !batchForm.expiryDate) {
      toastError('Validation', 'Medicine, Batch Number, and Expiry Date are required');
      return;
    }

    createMutation.mutate({
      medicineId: batchForm.medicineId,
      batchNumber: batchForm.batchNumber.trim().toUpperCase(),
      mfgDate: batchForm.mfgDate || undefined,
      expiryDate: batchForm.expiryDate,
      mrp: Number(batchForm.mrp || 0),
      purchasePrice: Number(batchForm.purchasePrice || 0),
      sellingPrice: Number(batchForm.sellingPrice || 0),
      packConversionFactor: Number(batchForm.packConversionFactor || 1),
      notes: batchForm.notes.trim() || undefined,
    });
  };

  const getDaysRemainingBadge = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
          EXPIRED ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          {diffDays} days left
        </span>
      );
    }
    if (diffDays <= 90) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
          {diffDays} days left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        {diffDays} days left
      </span>
    );
  };

  const medicines = medicinesData?.items ?? [];
  const batches = batchesData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Medicine Batches"
        description="Monitor batch lifecycles, manufacturing records, and FEFO expiry tracking"
        action={
          canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              id="btn-new-batch"
            >
              <Plus className="w-4 h-4 mr-1" /> Add New Batch
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={selectedMedId}
              onChange={(e) => {
                setSelectedMedId(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Medicines</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brandName} ({m.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={expiryFilter}
              onChange={(e) => {
                setExpiryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Expiry Windows</option>
              <option value="expired">Already Expired</option>
              <option value="30days">Expiring within 30 Days</option>
              <option value="60days">Expiring within 60 Days</option>
              <option value="90days">Expiring within 90 Days</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ACTIVE">Active Batches</option>
              <option value="EXPIRED">Expired Batches</option>
              <option value="QUARANTINED">Quarantined</option>
              <option value="RECALLED">Recalled</option>
              <option value="">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : batches.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-8 h-8" />}
            title="No batches found"
            description="Register a batch to track manufacturing date, expiry date and store balances."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Create Batch
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine (Brand / Generic)</th>
                  <th className="py-3 px-4">Mfg Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {batch.medicineName ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {batch.medicineSku ? `SKU: ${batch.medicineSku}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {new Date(batch.manufacturingDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-800">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getDaysRemainingBadge(batch.expiryDate)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      ₹{Number(batch.mrp).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      ₹{Number(batch.purchasePrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ₹{Number(batch.sellingPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          batch.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingBatch(batch)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-brand-600"
                          title="Edit Batch Prices"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {batchesData && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing {batches.length} of {batchesData.total} batches
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
                Page {page} of {batchesData.totalPages || 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= batchesData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Batch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-navy-900">Create New Medicine Batch</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Medicine *</label>
                <select
                  value={batchForm.medicineId}
                  onChange={(e) => setBatchForm({ ...batchForm, medicineId: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  required
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brandName} - {m.genericName} ({m.sku})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Batch Number *"
                placeholder="e.g. BATCH-2026-X1"
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mfg Date"
                  type="date"
                  value={batchForm.mfgDate}
                  onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
                />
                <Input
                  label="Expiry Date *"
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="MRP (₹) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchForm.mrp}
                  onChange={(e) => setBatchForm({ ...batchForm, mrp: e.target.value })}
                  required
                />
                <Input
                  label="Purchase Cost (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchForm.purchasePrice}
                  onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                />
                <Input
                  label="Selling Price (₹) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchForm.sellingPrice}
                  onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Pack Conversion Factor"
                type="number"
                min="1"
                value={batchForm.packConversionFactor}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, packConversionFactor: Number(e.target.value) })
                }
                hint="Default is 1 base unit"
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Save Batch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-navy-900">
                Edit Batch: {editingBatch.batchNumber}
              </h2>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingBatch.id,
                  body: {
                    mrp: Number(editingBatch.mrp),
                    sellingPrice: Number(editingBatch.sellingPrice),
                    status: editingBatch.status,
                    notes: editingBatch.notes,
                  },
                });
              }}
              className="space-y-4"
            >
              <Input
                label="MRP (₹)"
                type="number"
                step="0.01"
                value={editingBatch.mrp}
                onChange={(e) => setEditingBatch({ ...editingBatch, mrp: e.target.value })}
              />

              <Input
                label="Selling Price (₹)"
                type="number"
                step="0.01"
                value={editingBatch.sellingPrice}
                onChange={(e) => setEditingBatch({ ...editingBatch, sellingPrice: e.target.value })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Batch Status</label>
                <select
                  value={editingBatch.status}
                  onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="QUARANTINED">QUARANTINED</option>
                  <option value="RECALLED">RECALLED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setEditingBatch(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

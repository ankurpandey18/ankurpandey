import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Upload,
  AlertCircle,
  FolderOpen,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { inventoryApi, medicinesApi, batchesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button,
  Input,
  Select,
  PageHeader,
  Spinner,
  EmptyState,
  Badge,
  ConfirmDialog,
} from '../../components/ui';

export function OpeningStockPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isOwner = user?.role === 'OWNER';
  const canOperate = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Operations query
  const { data: operationsData, isLoading } = useQuery({
    queryKey: ['inventory', 'operations', { type: 'OPENING_STOCK' }],
    queryFn: () => inventoryApi.operations({ type: 'OPENING_STOCK', limit: 20 }),
  });

  // Master data lookups
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: () => inventoryApi.locations(false),
  });

  const { data: medicinesData } = useQuery({
    queryKey: ['medicines', { limit: 100, isActive: true }],
    queryFn: () => medicinesApi.list({ limit: 100, isActive: true }),
  });

  const { data: batchesData } = useQuery({
    queryKey: ['batches', { medicineId: selectedMedicineId }],
    queryFn: () => batchesApi.list({ medicineId: selectedMedicineId, limit: 50 }),
    enabled: !!selectedMedicineId,
  });

  // Create Opening Stock Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => inventoryApi.createOpeningStock(body),
    onSuccess: () => {
      success('Opening stock draft created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] });
      setIsCreateOpen(false);
      setQuantity('');
      setNotes('');
    },
    onError: (err: any) => toastError('Failed', err.message),
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.submitOpeningStock(id),
    onSuccess: () => {
      success('Opening stock submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] });
    },
    onError: (err: any) => toastError('Failed to submit', err.message),
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.approveOpeningStock(id),
    onSuccess: () => {
      success('Opening stock approved');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] });
    },
    onError: (err: any) => toastError('Failed to approve', err.message),
  });

  // Post Mutation
  const postMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.postOpeningStock(id),
    onSuccess: () => {
      success('Opening stock posted to inventory balances & ledger');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => toastError('Failed to post', err.message),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId || !selectedBatchId || Number(quantity) <= 0) {
      toastError('Validation', 'Location, Batch, and positive quantity are required');
      return;
    }

    createMutation.mutate({
      locationId: selectedLocationId,
      notes: notes || undefined,
      items: [
        {
          batchId: selectedBatchId,
          quantity: Number(quantity),
        },
      ],
    });
  };

  const operations = operationsData?.items ?? [];
  const medicines = medicinesData?.items ?? [];
  const batches = batchesData?.items ?? [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            DRAFT
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            PENDING APPROVAL
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            APPROVED (READY TO POST)
          </span>
        );
      case 'POSTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            POSTED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
            REJECTED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inventory
        </Button>
      </div>

      <PageHeader
        title="Opening Stock Management"
        description="Controlled multi-step initialization of existing store stock with owner approval & posting"
        action={
          canOperate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              id="btn-create-opening-stock"
            >
              <Plus className="w-4 h-4 mr-1" /> New Opening Stock
            </Button>
          )
        }
      />

      {/* Document History Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : operations.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-8 h-8" />}
            title="No opening stock documents"
            description="Create an opening stock document to safely initialize baseline physical inventory."
            action={
              canOperate ? (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Create Opening Stock
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Doc Number</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Medicine & Batch</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {operations.map((op) => {
                  const firstItem = op.items?.[0];
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">
                        {op.operationNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {firstItem?.destinationLocationName || firstItem?.sourceLocationName || 'Store'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {firstItem?.medicineName ?? '—'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Batch: {firstItem?.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {Number(firstItem?.quantity ?? 0)} Units
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(op.status)}</td>
                      <td className="py-3 px-4 text-slate-600">{op.requestedByName ?? '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {op.status === 'DRAFT' && canOperate && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => submitMutation.mutate(op.id)}
                              isLoading={submitMutation.isPending}
                            >
                              <Send className="w-3 h-3 mr-1" /> Submit
                            </Button>
                          )}
                          {op.status === 'SUBMITTED' && isOwner && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => approveMutation.mutate(op.id)}
                              isLoading={approveMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                          )}
                          {op.status === 'APPROVED' && isOwner && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => postMutation.mutate(op.id)}
                              isLoading={postMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Post Stock
                            </Button>
                          )}
                          {op.status === 'POSTED' && (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              ✓ Posted
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Opening Stock Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-navy-900">Record Opening Stock</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Storage Location *
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  required
                >
                  <option value="">Select Storage Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Medicine *</label>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => {
                    setSelectedMedicineId(e.target.value);
                    setSelectedBatchId('');
                  }}
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

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Medicine Batch *
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                  disabled={!selectedMedicineId}
                  required
                >
                  <option value="">Select Batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()}, MRP: ₹
                      {b.mrp})
                    </option>
                  ))}
                </select>
                {selectedMedicineId && batches.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No batches found for this medicine.{' '}
                    <button
                      type="button"
                      onClick={() => navigate(`/batches?medicineId=${selectedMedicineId}&action=new`)}
                      className="underline font-semibold"
                    >
                      Create Batch First
                    </button>
                  </p>
                )}
              </div>

              <Input
                label="Opening Quantity (Base Units) *"
                type="number"
                min="1"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <Input
                label="Notes / Supporting Reference"
                placeholder="Initial store setup count"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Save Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

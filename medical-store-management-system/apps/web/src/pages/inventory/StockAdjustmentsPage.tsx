import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Sliders,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';
import { inventoryApi, medicinesApi, batchesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button,
  Input,
  PageHeader,
  Spinner,
  EmptyState,
  Badge,
  ConfirmDialog,
} from '../../components/ui';

export function StockAdjustmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isOwner = user?.role === 'OWNER';
  const isPharmacist = user?.role === 'PHARMACIST';
  const canRequest = isOwner || isPharmacist;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('DAMAGE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Broken / damaged strip in storage');
  const [notes, setNotes] = useState('');

  // Operations query
  const { data: operationsData, isLoading } = useQuery({
    queryKey: ['inventory', 'operations', { type: 'ADJUSTMENT' }],
    queryFn: () => inventoryApi.operations({ type: 'ADJUSTMENT', limit: 25 }),
  });

  // Lookups
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

  // Create Adjustment Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => inventoryApi.createAdjustment(body),
    onSuccess: () => {
      success('Adjustment request created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] });
      setIsCreateOpen(false);
      setQuantity('');
      setNotes('');
    },
    onError: (err: any) => toastError('Creation Failed', err.message),
  });

  // Decide Mutation (Approve / Reject)
  const decideMutation = useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) =>
      inventoryApi.decideAdjustment(id, { action: approved ? 'APPROVE' : 'REJECT', reason: notes }),
    onSuccess: (_, vars) => {
      success(`Adjustment ${vars.approved ? 'Approved' : 'Rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] });
    },
    onError: (err: any) => toastError('Decision Failed', err.message),
  });

  // Post Mutation
  const postMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.postAdjustment(id),
    onSuccess: () => {
      success('Adjustment posted and ledger updated');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => toastError('Post Failed', err.message),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId || !selectedBatchId || !quantity) {
      toastError('Validation', 'Please fill all required adjustment fields');
      return;
    }

    // Determine signed quantity
    let qtyVal = Math.abs(Number(quantity));
    if (
      adjustmentType === 'DAMAGE' ||
      adjustmentType === 'EXPIRED' ||
      adjustmentType === 'STOCK_DECREASE'
    ) {
      qtyVal = -qtyVal;
    }

    createMutation.mutate({
      locationId: selectedLocationId,
      reason,
      notes: notes || undefined,
      items: [
        {
          batchId: selectedBatchId,
          quantity: qtyVal,
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
      case 'SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            PENDING APPROVAL
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            APPROVED (READY)
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
        title="Stock Adjustments"
        description="Formal audit requests for damages, expired batches, quantity gains and corrections"
        action={
          canRequest && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              id="btn-new-adjustment"
            >
              <Plus className="w-4 h-4 mr-1" /> Request Adjustment
            </Button>
          )
        }
      />

      {/* Adjustments Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : operations.length === 0 ? (
          <EmptyState
            icon={<Sliders className="w-8 h-8" />}
            title="No adjustment requests"
            description="Adjustments document any stock discrepancies, damages or quarantine events."
            action={
              canRequest ? (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Request First Adjustment
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Doc #</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Medicine & Batch</th>
                  <th className="py-3 px-4 text-right">Adjustment Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {operations.map((op) => {
                  const item = op.items?.[0];
                  const qty = Number(item?.quantity ?? 0);
                  const isOwnRequest = op.requestedById === user?.id;
                  const canDecide = isOwner && (!isOwnRequest || user?.role === 'OWNER');

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">
                        {op.operationNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item?.sourceLocationName || item?.destinationLocationName || 'Store'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {item?.medicineName ?? '—'}
                        </div>
                        <div className="font-mono text-slate-500 text-[10px]">
                          Batch: {item?.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span className={qty > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {qty > 0 ? `+${qty}` : qty} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {op.items[0]?.reason || op.notes || '—'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(op.status)}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{op.requestedByName ?? '—'}</div>
                        {isOwnRequest && (
                          <span className="text-[10px] text-slate-400 italic">(You)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {op.status === 'SUBMITTED' && isOwner && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  decideMutation.mutate({ id: op.id, approved: true })
                                }
                                isLoading={decideMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  decideMutation.mutate({ id: op.id, approved: false })
                                }
                                isLoading={decideMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {op.status === 'APPROVED' && isOwner && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => postMutation.mutate(op.id)}
                              isLoading={postMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Post
                            </Button>
                          )}

                          {op.status === 'POSTED' && (
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              ✓ Posted
                            </span>
                          )}
                          {op.status === 'REJECTED' && (
                            <span className="text-[10px] text-red-600 font-semibold">
                              ✗ Rejected
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

      {/* New Adjustment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-navy-900">Request Stock Adjustment</h2>
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
                  <option value="">Select Location</option>
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
                      {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Adjustment Category *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  <option value="DAMAGE">Damaged / Broken Stock (Decrease)</option>
                  <option value="EXPIRED">Expired Stock Removal (Decrease)</option>
                  <option value="STOCK_DECREASE">Inventory Shortage (Decrease)</option>
                  <option value="STOCK_INCREASE">Unrecorded Stock Found (Increase)</option>
                </select>
              </div>

              <Input
                label="Quantity (Units) *"
                type="number"
                min="1"
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <Input
                label="Reason *"
                placeholder="Detailed reason for auditing"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />

              <Input
                label="Notes"
                placeholder="Optional incident / reference notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

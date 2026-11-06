import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  X,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { inventoryApi, medicinesApi, batchesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input, PageHeader, Spinner, EmptyState, Badge } from '../../components/ui';

export function StockTransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const canOperate = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sourceLocId, setSourceLocId] = useState('');
  const [destLocId, setDestLocId] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Replenishing dispensing rack from main store');

  // Query transfers operations
  const { data: operationsData, isLoading } = useQuery({
    queryKey: ['inventory', 'operations', { type: 'TRANSFER' }],
    queryFn: () => inventoryApi.operations({ type: 'TRANSFER', limit: 25 }),
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

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: (body: any) => inventoryApi.createTransfer(body),
    onSuccess: () => {
      success('Stock transfer posted atomically');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsCreateOpen(false);
      setQuantity('');
    },
    onError: (err: any) => toastError('Transfer Failed', err.message),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocId || !destLocId || !selectedBatchId || Number(quantity) <= 0) {
      toastError('Validation', 'Please fill all required transfer fields');
      return;
    }
    if (sourceLocId === destLocId) {
      toastError('Validation', 'Source and destination locations must be different');
      return;
    }

    transferMutation.mutate({
      sourceLocationId: sourceLocId,
      destinationLocationId: destLocId,
      reason,
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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inventory
        </Button>
      </div>

      <PageHeader
        title="Stock Transfers"
        description="Atomic inter-rack and storage transfers maintaining batch integrity & movement records"
        action={
          canOperate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              id="btn-new-transfer"
            >
              <Plus className="w-4 h-4 mr-1" /> New Stock Transfer
            </Button>
          )
        }
      />

      {/* Transfers Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : operations.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft className="w-8 h-8" />}
            title="No transfer records"
            description="Move stock between main store, dispensing racks and cold storage."
            action={
              canOperate ? (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Transfer Stock
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
                  <th className="py-3 px-4">Transfer Route</th>
                  <th className="py-3 px-4">Medicine & Batch</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {operations.map((op) => {
                  const item = op.items?.[0];
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">
                        {op.operationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span>{item?.sourceLocationName ?? '—'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-brand-500" />
                          <span>{item?.destinationLocationName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {item?.medicineName ?? '—'}
                        </div>
                        <div className="font-mono text-slate-500 text-[10px]">
                          Batch: {item?.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {Number(item?.quantity ?? 0)} Units
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        {item?.reason || op.notes || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{op.requestedByName ?? '—'}</td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">
                        {new Date(op.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Transfer Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-base font-bold text-navy-900">Transfer Stock Between Locations</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Source Location *
                  </label>
                  <select
                    value={sourceLocId}
                    onChange={(e) => setSourceLocId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                    required
                  >
                    <option value="">From Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Destination Location *
                  </label>
                  <select
                    value={destLocId}
                    onChange={(e) => setDestLocId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                    required
                  >
                    <option value="">To Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
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

              <Input
                label="Transfer Quantity (Units) *"
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <Input
                label="Transfer Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={transferMutation.isPending}>
                  Execute Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

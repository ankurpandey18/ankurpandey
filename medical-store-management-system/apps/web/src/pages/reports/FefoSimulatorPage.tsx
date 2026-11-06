import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Pill,
} from 'lucide-react';
import { reportsApi, medicinesApi } from '../../services/api';
import { Button, Input, PageHeader, Spinner, EmptyState } from '../../components/ui';

export function FefoSimulatorPage() {
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [requestedQty, setRequestedQty] = useState('10');
  const [shouldSimulate, setShouldSimulate] = useState(false);

  // Medicines list
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines', { limit: 100, isActive: true }],
    queryFn: () => medicinesApi.list({ limit: 100, isActive: true }),
  });

  // Query FEFO preview
  const {
    data: fefoResult,
    isLoading: fefoLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'reports',
      'fefo',
      { medicineId: selectedMedicineId, requestedQuantity: Number(requestedQty) },
    ],
    queryFn: () => reportsApi.fefoPreview(selectedMedicineId, Number(requestedQty)),
    enabled: !!selectedMedicineId && Number(requestedQty) > 0 && shouldSimulate,
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicineId || Number(requestedQty) <= 0) return;
    setShouldSimulate(true);
    refetch();
  };

  const medicines = medicinesData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title="FEFO Allocation Engine Preview"
        description="Simulate First-Expiry-First-Out batch dispensing algorithms ensuring early-expiring inventory moves first"
      />

      {/* Simulator Inputs Card */}
      <div className="card p-6 border-l-4 border-l-brand-600">
        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Select Medicine Formulation *
              </label>
              <select
                value={selectedMedicineId}
                onChange={(e) => {
                  setSelectedMedicineId(e.target.value);
                  setShouldSimulate(false);
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
              <Input
                label="Requested Quantity *"
                type="number"
                min="1"
                value={requestedQty}
                onChange={(e) => {
                  setRequestedQty(e.target.value);
                  setShouldSimulate(false);
                }}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedMedicineId || Number(requestedQty) <= 0}
              id="btn-simulate-fefo"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Run FEFO Simulation
            </Button>
          </div>
        </form>
      </div>

      {/* Simulation Results */}
      {fefoLoading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : fefoResult ? (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Banner */}
          <div
            className={`card p-5 border-l-4 ${
              fefoResult.isFullyAllocated
                ? 'border-l-emerald-500 bg-emerald-50/30'
                : 'border-l-amber-500 bg-amber-50/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {fefoResult.isFullyAllocated ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="text-base font-bold text-navy-900">
                  {fefoResult.isFullyAllocated
                    ? 'Full Quantity Allocatable via FEFO'
                    : `Partial Allocation — Shortage of ${fefoResult.shortageQuantity} Units`}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Requested: <b>{fefoResult.requestedQuantity}</b> &middot; Total Allocated:{' '}
                  <b>{fefoResult.totalAllocatedQuantity}</b> &middot; Shortage:{' '}
                  <b>{fefoResult.shortageQuantity}</b>
                </p>
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recommended Batch Allocation Order (Earliest Expiry First)
              </h4>
            </div>

            {fefoResult.allocations.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-8 h-8 text-amber-500" />}
                title="No eligible batches available"
                description="All existing batches are either completely depleted or past their expiration date."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4">Days Left</th>
                      <th className="py-3 px-4 text-right">Available in Batch</th>
                      <th className="py-3 px-4 text-right">Allocated Qty</th>
                      <th className="py-3 px-4 text-right">Remaining in Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {fefoResult.allocations.map((alloc, idx) => (
                      <tr key={alloc.batchId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">#{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-900">
                          {alloc.batchNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {new Date(alloc.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {alloc.daysToExpiry} days
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {alloc.availableQuantity} Units
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-brand-700 text-sm">
                          {alloc.allocatedQuantity} Units
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {alloc.remainingBatchStock} Units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

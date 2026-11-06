import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Boxes,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  X,
  FileCheck,
} from 'lucide-react';
import { inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input, PageHeader, Spinner, EmptyState, Badge } from '../../components/ui';

export function StockCountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isOwner = user?.role === 'OWNER';
  const canOperate = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('Monthly physical stock audit');

  // Selected session for count recording/review
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  // Query sessions
  const { data: countSessionsData, isLoading } = useQuery({
    queryKey: ['inventory', 'counts'],
    queryFn: () => inventoryApi.counts({ limit: 20 }),
  });

  // Query active session detail
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['inventory', 'counts', activeSessionId],
    queryFn: () => inventoryApi.getCount(activeSessionId!),
    enabled: !!activeSessionId,
  });

  // Locations lookup
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: () => inventoryApi.locations(false),
  });

  // Create count session mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => inventoryApi.createCount(body),
    onSuccess: (res) => {
      success('Audit session initiated with system snapshot');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'counts'] });
      setIsCreateOpen(false);
      setActiveSessionId(res.id);
    },
    onError: (err: any) => toastError('Failed', err.message),
  });

  // Record counts mutation
  const recordItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) =>
      inventoryApi.recordCountItems(id, { items } as any),
    onSuccess: () => {
      success('Count values updated');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'counts', activeSessionId] });
    },
    onError: (err: any) => toastError('Save failed', err.message),
  });

  // Submit count mutation
  const submitMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.submitCount(id),
    onSuccess: () => {
      success('Count submitted for owner review');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'counts'] });
    },
    onError: (err: any) => toastError('Submit failed', err.message),
  });

  // Decide count mutation
  const decideMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      inventoryApi.decideCount(id, { action: approved ? 'APPROVE' : 'REJECT' }),
    onSuccess: (_, vars) => {
      success(`Session ${vars.approved ? 'Approved' : 'Rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'counts'] });
    },
    onError: (err: any) => toastError('Decision failed', err.message),
  });

  // Post count mutation
  const postMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.postCount(id),
    onSuccess: () => {
      success('Stock count variances posted to ledger');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setActiveSessionId(null);
    },
    onError: (err: any) => toastError('Post failed', err.message),
  });

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) {
      toastError('Validation', 'Please select a storage location');
      return;
    }
    createMutation.mutate({
      locationId: selectedLocationId,
      notes: sessionNotes,
    });
  };

  const handleSaveCounts = () => {
    if (!activeSessionId) return;
    const items = Object.entries(itemCounts).map(([batchId, countedQuantity]) => ({
      batchId,
      countedQuantity: Number(countedQuantity),
    }));
    recordItemsMutation.mutate({ id: activeSessionId, items });
  };

  const sessions = countSessionsData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inventory
        </Button>
      </div>

      <PageHeader
        title="Physical Stock Verification & Auditing"
        description="Conduct physical inventory counts, record batch variances, and reconcile stock with owner approval"
        action={
          canOperate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              id="btn-start-count"
            >
              <Plus className="w-4 h-4 mr-1" /> Start Count Session
            </Button>
          )
        }
      />

      {/* Active Session Detail View */}
      {activeSessionId && activeSession && (
        <div className="card p-6 border-2 border-brand-500 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <span className="text-xs uppercase font-bold text-brand-600">Active Audit Session</span>
              <h2 className="text-lg font-bold text-navy-900 font-mono">
                {activeSession.sessionNumber} &middot; {activeSession.locationName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                {activeSession.status}
              </span>
              <button
                onClick={() => setActiveSessionId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Items count grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3 text-right">System Snapshot</th>
                  <th className="py-2.5 px-3 text-right">Physical Count</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeSession.items?.map((item: any) => {
                  const sysQty = Number(item.systemQuantity);
                  const currentCount =
                    itemCounts[item.batchId] !== undefined
                      ? itemCounts[item.batchId]
                      : Number(item.countedQuantity ?? sysQty);
                  const variance = currentCount - sysQty;

                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.medicineName ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-navy-900">
                        {item.batchNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {sysQty} Units
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {activeSession.status === 'DRAFT' ? (
                          <input
                            type="number"
                            min="0"
                            value={currentCount}
                            onChange={(e) =>
                              setItemCounts({
                                ...itemCounts,
                                [item.batchId]: Number(e.target.value),
                              })
                            }
                            className="w-24 text-right font-mono text-sm border border-slate-300 rounded px-2 py-1"
                          />
                        ) : (
                          <span className="font-mono font-bold">{currentCount} Units</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            variance === 0
                              ? 'text-slate-400'
                              : variance > 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }
                        >
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Session Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-slate-500">
              Snapshot taken at: {new Date(activeSession.createdAt).toLocaleTimeString()}
            </div>
            <div className="flex gap-2">
              {activeSession.status === 'DRAFT' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveCounts}
                    isLoading={recordItemsMutation.isPending}
                  >
                    Save Counts
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => submitMutation.mutate(activeSession.id)}
                    isLoading={submitMutation.isPending}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Submit for Review
                  </Button>
                </>
              )}

              {activeSession.status === 'SUBMITTED' && isOwner && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => decideMutation.mutate({ id: activeSession.id, approved: true })}
                    isLoading={decideMutation.isPending}
                  >
                    Approve Variance
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => decideMutation.mutate({ id: activeSession.id, approved: false })}
                    isLoading={decideMutation.isPending}
                  >
                    Reject Session
                  </Button>
                </>
              )}

              {activeSession.status === 'APPROVED' && isOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => postMutation.mutate(activeSession.id)}
                  isLoading={postMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Post Variance Movements
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session History Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-8 h-8" />}
            title="No physical count sessions"
            description="Initiate a count session for a specific location to verify physical inventory against system records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Session #</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Auditor</th>
                  <th className="py-3 px-4 text-right">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {s.sessionNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {s.locationName ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{s.notes || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.createdByName ?? '—'}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveSessionId(s.id)}
                      >
                        Open Session
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Start Session Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-base font-bold text-navy-900 mb-4 border-b pb-2">
              Start Stock Count Session
            </h2>

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Location to Count *
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
                <p className="text-xs text-slate-500 mt-1">
                  The system will snapshot current stock balances for all batches in this location.
                </p>
              </div>

              <Input
                label="Session Notes / Purpose"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Initialize Snapshot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

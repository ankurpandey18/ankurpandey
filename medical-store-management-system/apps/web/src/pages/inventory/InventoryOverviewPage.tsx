import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Layers,
  ArrowRightLeft,
  Sliders,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  MapPin,
  RefreshCw,
  FolderOpen,
  Boxes,
} from 'lucide-react';
import { inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input, PageHeader, Spinner, EmptyState, Badge } from '../../components/ui';

export function InventoryOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [page, setPage] = useState(1);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('RACK');

  const isOwner = user?.role === 'OWNER';
  const canOperate = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: () => inventoryApi.locations(true),
  });

  // Fetch stock balances
  const {
    data: balancesData,
    isLoading: balancesLoading,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: [
      'inventory',
      'balances',
      { page, limit: 15, search: searchTerm, locationId: selectedLocationId || undefined },
    ],
    queryFn: () =>
      inventoryApi.balances({
        page,
        limit: 15,
        search: searchTerm || undefined,
        locationId: selectedLocationId || undefined,
      }),
  });

  // Fetch reconciliation status
  const {
    data: reconData,
    isLoading: reconLoading,
    refetch: triggerRecon,
  } = useQuery({
    queryKey: ['inventory', 'reconciliation'],
    queryFn: () => inventoryApi.reconciliation(),
    enabled: isOwner,
  });

  // Create Location Mutation
  const createLocMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createLocation({
        name: locName.trim(),
        code: locCode.trim().toUpperCase(),
        type: locType as any,
      }),
    onSuccess: () => {
      success('Storage location created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'locations'] });
      setIsLocationModalOpen(false);
      setLocName('');
      setLocCode('');
    },
    onError: (err: any) => toastError('Failed', err.message),
  });

  const balances = balancesData?.items ?? [];
  const totalQuantity = balances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Operations & Stock Balances"
        description="Real-time multi-location stock tracking, immutable movements, and storage administration"
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLocationModalOpen(true)}
                id="btn-add-location"
              >
                <MapPin className="w-4 h-4 mr-1" /> Add Location
              </Button>
            )}
            {canOperate && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/inventory/opening-stock')}
                id="btn-nav-opening-stock"
              >
                <FolderOpen className="w-4 h-4 mr-1" /> Opening Stock
              </Button>
            )}
          </div>
        }
      />

      {/* Quick Navigation Cards for Operations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/inventory/ledger')}
          className="card p-4 text-left hover:border-brand-500 hover:shadow-md transition-all group"
          id="card-nav-ledger"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ClipboardList className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-navy-900">Stock Ledger</p>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit trail</p>
        </button>

        <button
          onClick={() => navigate('/inventory/adjustments')}
          className="card p-4 text-left hover:border-brand-500 hover:shadow-md transition-all group"
          id="card-nav-adjustments"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Sliders className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-navy-900">Adjustments</p>
          <p className="text-xs text-slate-500 mt-0.5">Damaged, expired & counts</p>
        </button>

        <button
          onClick={() => navigate('/inventory/transfers')}
          className="card p-4 text-left hover:border-brand-500 hover:shadow-md transition-all group"
          id="card-nav-transfers"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-navy-900">Transfers</p>
          <p className="text-xs text-slate-500 mt-0.5">Inter-rack relocation</p>
        </button>

        <button
          onClick={() => navigate('/inventory/counts')}
          className="card p-4 text-left hover:border-brand-500 hover:shadow-md transition-all group"
          id="card-nav-counts"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Boxes className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-navy-900">Stock Counts</p>
          <p className="text-xs text-slate-500 mt-0.5">Physical audit & variance</p>
        </button>
      </div>

      {/* Reconciliation Banner (Owner Only) */}
      {isOwner && reconData && (
        <div
          className={`card p-4 border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            reconData.discrepancyCount === 0
              ? 'border-l-emerald-500 bg-emerald-50/40'
              : 'border-l-red-500 bg-red-50/40'
          }`}
        >
          <div className="flex items-start gap-3">
            {reconData.discrepancyCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold text-slate-800">
                Stock Balance & Ledger Reconciliation: {reconData.status}
              </p>
              <p className="text-xs text-slate-600">
                Audited {reconData.totalRowsAudited} location balance records against immutable
                ledger entries. Discrepancies: {reconData.discrepancyCount}.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerRecon()}
            disabled={reconLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${reconLoading ? 'animate-spin' : ''}`} />
            Re-verify
          </Button>
        </div>
      )}

      {/* Stock Balances Section */}
      <div className="space-y-4">
        {/* Search & Location Filter */}
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock by brand name, generic name, batch number, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">All Storage Locations ({locations.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} [{loc.type}] ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Balances Data Table */}
        <div className="card overflow-hidden">
          {balancesLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : balances.length === 0 ? (
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title="No stock balances found"
              description="Stock balances reflect real-time physical inventory across your racks and shelves."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                    <th className="py-3 px-4">Medicine & SKU</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4 text-right">Quantity on Hand</th>
                    <th className="py-3 px-4 text-right">Pack Equiv.</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balances.map((b) => {
                    const isZero = Number(b.quantityOnHand) === 0;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {b.medicineName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            SKU: {b.medicineSku}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-900">
                          {b.batchNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {b.locationName}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {b.locationCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold ${
                              isZero ? 'text-slate-400' : 'text-navy-900'
                            }`}
                          >
                            {b.quantityOnHand} Units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                          {b.quantityOnHand}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-700">
                          {b.expiryDate
                            ? new Date(b.expiryDate).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-slate-400">
                          {b.lastMovementAt ? new Date(b.lastMovementAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {balancesData && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
              <div>
                Showing {balances.length} of {balancesData.total} balance records
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
                  Page {page} of {balancesData.totalPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= balancesData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Storage Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h2 className="text-base font-bold text-navy-900 mb-4 border-b pb-2">
              Add Storage Location
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!locName || !locCode) {
                  toastError('Validation', 'Name and Code are required');
                  return;
                }
                createLocMutation.mutate();
              }}
              className="space-y-4"
            >
              <Input
                label="Location Name *"
                placeholder="e.g. Shelf B-02 or Cold Storage Unit"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                required
              />

              <Input
                label="Location Code *"
                placeholder="e.g. SHELF-B02"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                hint="Unique identifier for barcodes or signage"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Location Type</label>
                <select
                  value={locType}
                  onChange={(e) => setLocType(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  <option value="MAIN_STORE">Main Store</option>
                  <option value="RACK">Rack</option>
                  <option value="SHELF">Shelf</option>
                  <option value="CABINET">Storage Cabinet</option>
                  <option value="COLD_STORAGE">Refrigerator / Cold Storage</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={createLocMutation.isPending}>
                  Save Location
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

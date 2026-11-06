import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  ClipboardList,
  MapPin,
  User,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { inventoryApi } from '../../services/api';
import { Button, PageHeader, Spinner, EmptyState } from '../../components/ui';

export function StockLedgerPage() {
  const navigate = useNavigate();

  const [movementType, setMovementType] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Locations for dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: () => inventoryApi.locations(true),
  });

  // Query ledger
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: [
      'inventory',
      'ledger',
      {
        page,
        limit: 20,
        movementType: movementType || undefined,
        locationId: locationId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    ],
    queryFn: () =>
      inventoryApi.ledger({
        page,
        limit: 20,
        movementType: (movementType as any) || undefined,
        locationId: locationId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const movements = ledgerData?.items ?? [];

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'OPENING_STOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            OPENING STOCK
          </span>
        );
      case 'ADJUSTMENT_IN':
      case 'TRANSFER_IN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {type.replace('_', ' ')}
          </span>
        );
      case 'ADJUSTMENT_OUT':
      case 'TRANSFER_OUT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {type.replace('_', ' ')}
          </span>
        );
      case 'DAMAGE':
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            {type}
          </span>
        );
      case 'STOCK_COUNT_VARIANCE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
            AUDIT VARIANCE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inventory
        </Button>
      </div>

      <PageHeader
        title="Stock Movement Ledger"
        description="Immutable, double-entry inventory audit ledger recording all physical quantity modifications"
      />

      {/* Filter Card */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
              Movement Type
            </label>
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Movement Types</option>
              <option value="OPENING_STOCK">Opening Stock</option>
              <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
              <option value="DAMAGE">Damage</option>
              <option value="EXPIRED">Expired</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="STOCK_COUNT_VARIANCE">Stock Count Variance</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
              Location
            </label>
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Storage Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="No ledger movements found"
            description="All posted opening stocks, adjustments, and transfers are recorded here permanently."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Medicine & Batch</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Qty Change</th>
                  <th className="py-3 px-4 text-right">Before &rarr; After</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {movements.map((m) => {
                  const qtyChange = Number(m.quantityChange);
                  const isPositive = qtyChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                        <div>{new Date(m.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getMovementBadge(m.movementType)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy-900">
                          {m.medicineName}
                        </div>
                        <div className="font-mono text-slate-500 text-[10px]">
                          Batch: {m.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">{m.locationName}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${qtyChange}` : qtyChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {Number(m.quantityBefore)} &rarr;{' '}
                        <span className="font-semibold text-slate-900">
                          {Number(m.quantityAfter)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{m.reason || '—'}</div>
                        {m.referenceDoc && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {m.referenceDoc}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {m.createdByName ?? 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {ledgerData && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing {movements.length} of {ledgerData.total} movement records
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
                Page {page} of {ledgerData.totalPages || 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= ledgerData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

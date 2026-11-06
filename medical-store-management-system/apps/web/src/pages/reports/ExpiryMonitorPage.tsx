import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Download,
  ShieldAlert,
  ArrowRight,
  Filter,
  DollarSign,
  Package,
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { Button, PageHeader, Spinner, EmptyState } from '../../components/ui';

export function ExpiryMonitorPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'expired' | '30days' | '60days' | '90days'>('all');

  const { data: expiryItems = [], isLoading } = useQuery({
    queryKey: ['reports', 'expiry', filter],
    queryFn: () => reportsApi.expiry(filter === 'all' ? undefined : filter),
  });

  // Calculate high-level summary metrics
  const expiredCount = expiryItems.filter((i) => i.daysRemaining < 0).length;
  const in30Count = expiryItems.filter((i) => i.daysRemaining >= 0 && i.daysRemaining <= 30).length;
  const in60Count = expiryItems.filter((i) => i.daysRemaining > 30 && i.daysRemaining <= 60).length;
  const in90Count = expiryItems.filter((i) => i.daysRemaining > 60 && i.daysRemaining <= 90).length;

  const totalExpiredValuation = expiryItems
    .filter((i) => i.daysRemaining < 0)
    .reduce((sum, i) => sum + Number(i.totalValue || 0), 0);

  const getDaysBadge = (days: number) => {
    if (days < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
          EXPIRED ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          {days} days remaining
        </span>
      );
    }
    if (days <= 60) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
          {days} days remaining
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
        {days} days remaining
      </span>
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Medicine',
      'Generic',
      'Batch',
      'Expiry Date',
      'Days Remaining',
      'Quantity on Hand',
      'Unit',
      'Purchase Cost',
      'Valuation at Cost',
    ];
    const rows = expiryItems.map((item) => [
      `"${item.medicineName.replace(/"/g, '""')}"`,
      `"${item.sku}"`,
      `"${item.batchNumber}"`,
      new Date(item.expiryDate).toLocaleDateString(),
      item.daysRemaining,
      item.quantityOnHand,
      item.locationName,
      item.purchaseCost,
      item.totalValue,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expiry-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        title="Medicine Expiry Monitor"
        description="Near-expiry intelligence, FEFO exclusion audit, and store loss prevention"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={expiryItems.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 border-l-4 border-l-red-600">
          <p className="text-xs font-semibold text-slate-500 uppercase">Already Expired</p>
          <p className="text-2xl font-bold font-mono text-red-600 mt-1">{expiredCount}</p>
          <span className="text-[10px] text-red-500 font-medium">Blocked from FEFO</span>
        </div>

        <div className="card p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">&le; 30 Days</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{in30Count}</p>
          <span className="text-[10px] text-amber-600 font-medium">Critical Priority</span>
        </div>

        <div className="card p-4 border-l-4 border-l-yellow-400">
          <p className="text-xs font-semibold text-slate-500 uppercase">&le; 60 Days</p>
          <p className="text-2xl font-bold font-mono text-yellow-700 mt-1">{in60Count}</p>
          <span className="text-[10px] text-yellow-600 font-medium">Attention</span>
        </div>

        <div className="card p-4 border-l-4 border-l-blue-400">
          <p className="text-xs font-semibold text-slate-500 uppercase">&le; 90 Days</p>
          <p className="text-2xl font-bold font-mono text-blue-600 mt-1">{in90Count}</p>
          <span className="text-[10px] text-blue-600 font-medium">Upcoming</span>
        </div>

        <div className="card p-4 border-l-4 border-l-slate-400 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase">Expired Loss (Cost)</p>
          <p className="text-2xl font-bold font-mono text-navy-900 mt-1">
            ₹{totalExpiredValuation.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">At Purchase Cost</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {(
          [
            ['all', 'All Monitored'],
            ['expired', 'Expired Only'],
            ['30days', '30 Days'],
            ['60days', '60 Days'],
            ['90days', '90 Days'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              filter === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : expiryItems.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-8 h-8" />}
            title="No batches match this expiry window"
            description="Your inventory is healthy. No active batches are expiring within this timeframe."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4 text-right">Stock Quantity</th>
                  <th className="py-3 px-4 text-right">Value (Cost)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {expiryItems.map((item) => (
                  <tr key={item.batchId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.medicineName}</div>
                      <div className="text-slate-500 font-mono text-[10px]">SKU: {item.sku}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {item.batchNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">{getDaysBadge(item.daysRemaining)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {item.quantityOnHand} Units
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ₹{Number(item.totalValue).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.daysRemaining < 0 && (
                        <button
                          onClick={() => navigate('/inventory/adjustments')}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700 underline"
                        >
                          Write-off
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

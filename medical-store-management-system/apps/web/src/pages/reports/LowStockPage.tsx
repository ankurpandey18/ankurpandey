import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Search,
  Download,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { reportsApi, masterDataApi } from '../../services/api';
import { Button, PageHeader, Spinner, EmptyState } from '../../components/ui';

export function LowStockPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['masterData', 'categories'],
    queryFn: () => masterDataApi.categories(false),
  });

  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ['reports', 'lowStock', { search: searchTerm, categoryId }],
    queryFn: () =>
      reportsApi.lowStock({
        search: searchTerm || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }),
  });

  const handleExportCsv = () => {
    const headers = [
      'Medicine',
      'Generic',
      'SKU',
      'Category',
      'Min Stock Level',
      'Current Stock',
      'Deficit',
      'Base Unit',
    ];
    const rows = lowStockItems.map((item) => [
      `"${item.brandName.replace(/"/g, '""')}"`,
      `"${item.genericName.replace(/"/g, '""')}"`,
      `"${item.sku}"`,
      `"${item.categoryName || ''}"`,
      item.minStockLevel,
      item.totalStock,
      item.deficitQuantity,
      'Units',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `low-stock-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Low Stock & Reorder Alerts"
        description="Medicines whose total eligible inventory has breached the minimum stock reorder threshold"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={lowStockItems.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search low stock medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : lowStockItems.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="All medicines are sufficiently stocked"
            description="No active medicines have breached their reorder threshold levels."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                  <th className="py-3 px-4">Medicine & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Deficit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lowStockItems.map((item) => {
                  const isOut = Number(item.totalStock) === 0;
                  return (
                    <tr key={item.medicineId} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy-900">{item.brandName}</div>
                        <div className="text-slate-500 text-[10px]">
                          {item.genericName} &middot;{' '}
                          <span className="font-mono text-slate-400">{item.sku}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.categoryName || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {item.minStockLevel} Units
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isOut ? 'text-red-600' : 'text-amber-600'}>
                          {item.totalStock} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                        -{item.deficitQuantity} Units
                      </td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            OUT OF STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            LOW STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/medicines/${item.medicineId}`)}
                        >
                          View Medicine
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

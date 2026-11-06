import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Plus,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  Barcode,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Archive,
  Pill,
} from 'lucide-react';
import { medicinesApi, batchesApi, inventoryApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button,
  Badge,
  Spinner,
  EmptyState,
  PageHeader,
  Input,
} from '../../components/ui';

export function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [newBarcode, setNewBarcode] = useState('');
  const [showAddBarcode, setShowAddBarcode] = useState(false);

  const canEdit = user?.role === 'OWNER' || user?.role === 'PHARMACIST';

  // Fetch medicine details
  const {
    data: medicine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['medicines', id],
    queryFn: () => medicinesApi.get(id!),
    enabled: !!id,
  });

  // Fetch batches for this medicine
  const { data: batchesData } = useQuery({
    queryKey: ['batches', { medicineId: id }],
    queryFn: () => batchesApi.list({ medicineId: id, limit: 50 }),
    enabled: !!id,
  });

  // Fetch location stock balances for this medicine
  const { data: balancesData } = useQuery({
    queryKey: ['inventory', 'balances', { medicineId: id }],
    queryFn: () => inventoryApi.balances({ medicineId: id }),
    enabled: !!id,
  });

  // Barcode addition mutation
  const barcodeMutation = useMutation({
    mutationFn: (bc: string) => medicinesApi.addBarcode(id!, bc),
    onSuccess: () => {
      success('Barcode added to medicine');
      queryClient.invalidateQueries({ queryKey: ['medicines', id] });
      setNewBarcode('');
      setShowAddBarcode(false);
    },
    onError: (err: any) => {
      toastError('Failed to add barcode', err.message || 'Error occurred');
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !medicine) {
    return (
      <div className="p-8 text-center text-red-600">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold">Medicine not found or error loading.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/medicines')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Catalogue
        </Button>
      </div>
    );
  }

  const batches = batchesData?.items ?? [];
  const balances = balancesData?.items ?? [];

  const totalStock = balances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
  const isLowStock = totalStock <= Number(medicine.minStockLevel);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/medicines')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Catalogue
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/medicines/${id}/edit`)}
              id="btn-edit-medicine"
            >
              <Edit2 className="w-4 h-4 mr-1" /> Edit Details
            </Button>
          )}
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/batches?medicineId=${id}&action=new`)}
              id="btn-add-batch"
            >
              <Plus className="w-4 h-4 mr-1" /> New Batch
            </Button>
          )}
        </div>
      </div>

      {/* Header Info Banner */}
      <div className="card p-6 border-l-4 border-l-brand-600">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-navy-900">{medicine.brandName}</h1>
              {medicine.isActive ? (
                <Badge variant="active">Active</Badge>
              ) : (
                <Badge variant="inactive">Inactive</Badge>
              )}
              {medicine.prescriptionRequired && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-300">
                  Rx Required
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 mt-1">{medicine.genericName}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              SKU: {medicine.sku} &middot; Display: {medicine.displayName}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-medium">Available Stock</p>
              <p
                className={`text-xl font-bold font-mono ${
                  isLowStock ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {totalStock} {medicine.baseUnit}
              </p>
              {isLowStock && (
                <span className="text-[10px] text-red-600 font-semibold">Low Stock Alert</span>
              )}
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-medium">Min Threshold</p>
              <p className="text-xl font-bold font-mono text-slate-700">{medicine.minStockLevel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Formulation, Packaging & Barcodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specification Card */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide border-b pb-2">
            Specifications & Formulation
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-medium text-slate-800">{medicine.category?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Manufacturer</p>
              <p className="font-medium text-slate-800">{medicine.manufacturer?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Dosage Form</p>
              <p className="font-medium text-slate-800">{medicine.dosageForm?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Regulatory Category</p>
              <p className="font-medium text-slate-800">{medicine.regulatoryCategory || 'GENERAL'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Packaging Type</p>
              <p className="font-medium text-slate-800">{medicine.packUnit}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pack Conversion</p>
              <p className="font-medium text-slate-800">
                1 {medicine.packUnit} = {medicine.unitsPerPack} {medicine.baseUnit}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">HSN Code</p>
              <p className="font-mono text-slate-800">{medicine.hsnCode || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">GST Rate</p>
              <p className="font-medium text-slate-800">{medicine.gstRate}%</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Storage Conditions</p>
              <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded mt-0.5">
                {medicine.storageConditions || 'Standard pharmacy storage.'}
              </p>
            </div>
          </div>
        </div>

        {/* Compositions & Barcodes Card */}
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide border-b pb-2">
              Salt Compositions
            </h2>
            {medicine.compositions && medicine.compositions.length > 0 ? (
              <ul className="divide-y divide-slate-100 mt-2">
                {medicine.compositions.map((comp) => (
                  <li key={comp.id} className="py-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {comp.compositionName ?? 'Active Salt'}
                    </span>
                    <span className="font-mono text-slate-600">
                      {comp.strengthValue ? `${comp.strengthValue} ${comp.unitSymbol || ''}` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic mt-2">No active salts mapped.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
                Barcodes & Identifiers
              </h2>
              {canEdit && (
                <button
                  onClick={() => setShowAddBarcode(!showAddBarcode)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  + Add Barcode
                </button>
              )}
            </div>

            {medicine.barcodes && medicine.barcodes.length > 0 && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded border text-xs">
                <Barcode className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-slate-700">{medicine.barcodes[0]?.barcode}</span>
                <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-semibold ml-auto">
                  {medicine.barcodes[0]?.packagingType}
                </span>
              </div>
            )}

            {medicine.barcodes && medicine.barcodes.length > 0 && (
              <div className="space-y-1 mt-1">
                {medicine.barcodes.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 p-1.5 bg-slate-50/50 rounded text-xs font-mono"
                  >
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.barcode}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">{b.packagingType}</span>
                  </div>
                ))}
              </div>
            )}

            {showAddBarcode && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Scan or enter barcode..."
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  className="flex-1 text-xs border rounded px-2 py-1"
                />
                <Button
                  size="sm"
                  onClick={() => newBarcode && barcodeMutation.mutate(newBarcode)}
                  isLoading={barcodeMutation.isPending}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock By Location */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide border-b pb-2 flex items-center justify-between">
          <span>Stock Balances by Location</span>
          <span className="text-xs text-slate-500 lowercase font-normal">
            Total: {totalStock} {medicine.baseUnit}
          </span>
        </h2>

        {balances.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No physical stock recorded"
            description="Use Opening Stock or inventory operations to allocate stock."
            action={
              canEdit ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/inventory?tab=opening-stock')}
                >
                  Record Opening Stock
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3 text-right">Quantity on Hand</th>
                  <th className="py-2.5 px-3 text-right">Pack Equivalent</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {balances.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {b.locationName}
                      <span className="text-slate-400 font-mono text-[10px] ml-1">
                        ({b.locationCode})
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-brand-700">
                      {b.batchNumber}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-navy-900">
                      {b.quantityOnHand} {medicine.baseUnit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {(Number(b.quantityOnHand) / Number(medicine.unitsPerPack)).toFixed(1)} Packs
                    </td>
                    <td className="py-2 px-3">
                      {Number(b.quantityOnHand) > 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                          Available
                        </span>
                      ) : (
                        <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          Zero Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batches Table */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
            Registered Medicine Batches ({batches.length})
          </h2>
          {canEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/batches?medicineId=${id}&action=new`)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch
            </Button>
          )}
        </div>

        {batches.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-6 h-6" />}
            title="No batches registered"
            description="Batches track manufacturing dates, expiry dates, and MRP."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b">
                  <th className="py-2.5 px-3">Batch #</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">Cost Price</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {batches.map((batch) => {
                  const expDate = new Date(batch.expiryDate);
                  const isExpired = expDate < new Date();
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-bold text-navy-900">
                        {batch.batchNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        {new Date(batch.manufacturingDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span
                          className={`font-semibold ${
                            isExpired ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {expDate.toLocaleDateString()}
                        </span>
                        {isExpired && (
                          <span className="ml-2 text-[10px] text-red-600 bg-red-50 px-1 rounded">
                            EXPIRED
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(batch.mrp).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        ₹{Number(batch.purchasePrice).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                        ₹{Number(batch.sellingPrice).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
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

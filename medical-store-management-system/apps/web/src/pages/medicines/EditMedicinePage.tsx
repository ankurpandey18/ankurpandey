import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { medicinesApi, masterDataApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Input, Select, PageHeader, Spinner } from '../../components/ui';

export function EditMedicinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Master data lookups
  const { data: categories = [] } = useQuery({
    queryKey: ['masterData', 'categories'],
    queryFn: () => masterDataApi.categories(false),
  });
  const { data: manufacturers = [] } = useQuery({
    queryKey: ['masterData', 'manufacturers'],
    queryFn: () => masterDataApi.manufacturers(false),
  });
  const { data: dosageForms = [] } = useQuery({
    queryKey: ['masterData', 'dosageForms'],
    queryFn: () => masterDataApi.dosageForms(),
  });
  const { data: adminRoutes = [] } = useQuery({
    queryKey: ['masterData', 'adminRoutes'],
    queryFn: () => masterDataApi.administrationRoutes(),
  });
  const { data: units = [] } = useQuery({
    queryKey: ['masterData', 'units'],
    queryFn: () => masterDataApi.units(),
  });

  // Fetch current medicine
  const {
    data: medicine,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['medicines', id],
    queryFn: () => medicinesApi.get(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    brandName: '',
    genericName: '',
    sku: '',
    categoryId: '',
    manufacturerId: '',
    dosageFormId: '',
    administrationRouteId: '',
    primaryBarcode: '',
    baseUnit: 'TABLET',
    packUnit: 'STRIP',
    unitsPerPack: 10,
    minStockLevel: 20,
    storageConditions: '',
    hsnCode: '',
    gstRate: 12,
    regulatoryCategory: 'SCHEDULE_H',
    prescriptionRequired: true,
    isActive: true,
    sideEffects: '',
  });

  useEffect(() => {
    if (medicine) {
      setFormData({
        brandName: medicine.brandName || '',
        genericName: medicine.genericName || '',
        sku: medicine.sku || '',
        categoryId: medicine.categoryId ? String(medicine.categoryId) : '',
        manufacturerId: medicine.manufacturerId ? String(medicine.manufacturerId) : '',
        dosageFormId: medicine.dosageFormId ? String(medicine.dosageFormId) : '',
        administrationRouteId: medicine.administrationRouteId
          ? String(medicine.administrationRouteId)
          : '',
        primaryBarcode: medicine.barcodes?.[0]?.barcode || '',
        baseUnit: medicine.baseUnit || 'TABLET',
        packUnit: medicine.packUnit || 'STRIP',
        unitsPerPack: Number(medicine.unitsPerPack || 10),
        minStockLevel: Number(medicine.minStockLevel || 20),
        storageConditions: medicine.storageConditions || '',
        hsnCode: medicine.hsnCode || '',
        gstRate: Number(medicine.gstRate || 12),
        regulatoryCategory: medicine.regulatoryCategory || 'SCHEDULE_H',
        prescriptionRequired: !!medicine.prescriptionRequired,
        isActive: !!medicine.isActive,
        sideEffects: medicine.sideEffects || '',
      });
    }
  }, [medicine]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => medicinesApi.update(id!, payload),
    onSuccess: () => {
      success('Medicine updated successfully');
      queryClient.invalidateQueries({ queryKey: ['medicines', id] });
      navigate(`/medicines/${id}`);
    },
    onError: (err: any) => {
      toastError('Update Failed', err.message || 'Error occurred');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      brandName: formData.brandName.trim(),
      genericName: formData.genericName.trim(),
      categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
      manufacturerId: formData.manufacturerId ? Number(formData.manufacturerId) : undefined,
      dosageFormId: formData.dosageFormId ? Number(formData.dosageFormId) : undefined,
      administrationRouteId: formData.administrationRouteId
        ? Number(formData.administrationRouteId)
        : undefined,
      primaryBarcode: formData.primaryBarcode.trim() || undefined,
      baseUnit: formData.baseUnit.trim().toUpperCase(),
      packUnit: formData.packUnit.trim().toUpperCase(),
      unitsPerPack: Number(formData.unitsPerPack),
      minStockLevel: Number(formData.minStockLevel),
      storageConditions: formData.storageConditions.trim() || undefined,
      hsnCode: formData.hsnCode.trim() || undefined,
      gstRate: Number(formData.gstRate),
      regulatoryCategory: formData.regulatoryCategory || undefined,
      prescriptionRequired: formData.prescriptionRequired,
      isActive: formData.isActive,
      sideEffects: formData.sideEffects.trim() || undefined,
    };
    updateMutation.mutate(payload);
  };

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
        <p className="font-semibold">Medicine not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/medicines')} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/medicines/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Details
        </Button>
      </div>

      <PageHeader
        title={`Edit Medicine: ${medicine.brandName}`}
        description={`Update formulation specifications for SKU ${medicine.sku}`}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Brand Name *"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
            />
            <Input
              label="Generic Name *"
              value={formData.genericName}
              onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
            />
            <Input label="SKU (Read Only)" value={formData.sku} disabled />
            <Input
              label="Primary Barcode"
              value={formData.primaryBarcode}
              onChange={(e) => setFormData({ ...formData, primaryBarcode: e.target.value })}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Manufacturer *</label>
              <select
                value={formData.manufacturerId}
                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                className="text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Dosage Form *</label>
              <select
                value={formData.dosageFormId}
                onChange={(e) => setFormData({ ...formData, dosageFormId: e.target.value })}
                className="text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                {dosageForms.map((df) => (
                  <option key={df.id} value={df.id}>
                    {df.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Pack Unit *"
              value={formData.packUnit}
              onChange={(e) => setFormData({ ...formData, packUnit: e.target.value })}
            />

            <Input
              label="Min Stock Threshold *"
              type="number"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
            />

            <Input
              label="Units Per Pack *"
              type="number"
              value={formData.unitsPerPack}
              onChange={(e) => setFormData({ ...formData, unitsPerPack: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={formData.prescriptionRequired}
                onChange={(e) =>
                  setFormData({ ...formData, prescriptionRequired: e.target.checked })
                }
                className="w-4 h-4 text-brand-600 rounded"
              />
              Requires Prescription (Rx)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              Active Status
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(`/medicines/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

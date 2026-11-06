import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { medicinesApi, masterDataApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Input, Select, PageHeader } from '../../components/ui';

export function AddMedicinePage() {
  const navigate = useNavigate();
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

  // Form state
  const [formData, setFormData] = useState({
    brandName: '',
    genericName: '',
    sku: '',
    categoryId: '',
    manufacturerId: '',
    dosageFormId: '',
    administrationRouteId: '',
    measurementUnitId: '',
    strength: '',
    primaryBarcode: '',
    packagingType: 'STRIP',
    baseUnit: 'TABLET',
    packName: '10 Tablets Strip',
    unitsPerPack: 10,
    minStockLevel: 20,
    storageInstructions: 'Store in a cool and dry place below 25°C',
    hsnCode: '3004',
    gstRate: 12,
    regulatoryClass: 'SCHEDULE_H',
    prescriptionRequired: true,
    isActive: true,
    notes: '',
  });

  // Dynamic compositions
  const [compositions, setCompositions] = useState<
    Array<{ compositionName: string; strength: string; unit: string }>
  >([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleAddComposition = () => {
    setCompositions([...compositions, { compositionName: '', strength: '', unit: 'mg' }]);
  };

  const handleRemoveComposition = (index: number) => {
    setCompositions(compositions.filter((_, i) => i !== index));
  };

  const handleCompositionChange = (index: number, field: string, val: string) => {
    const updated = [...compositions];
    updated[index] = { ...updated[index], [field]: val };
    setCompositions(updated);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.brandName.trim()) errors.brandName = 'Brand name is required';
    if (!formData.genericName.trim()) errors.genericName = 'Generic name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.manufacturerId) errors.manufacturerId = 'Manufacturer is required';
    if (!formData.dosageFormId) errors.dosageFormId = 'Dosage form is required';
    if (!formData.strength.trim()) errors.strength = 'Strength is required';
    if (!formData.baseUnit.trim()) errors.baseUnit = 'Base unit is required';
    if (Number(formData.unitsPerPack) <= 0)
      errors.unitsPerPack = 'Units per pack must be greater than 0';
    if (Number(formData.minStockLevel) < 0)
      errors.minStockLevel = 'Min stock level must be positive';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) => medicinesApi.create(payload),
    onSuccess: (res) => {
      success('Medicine added successfully', `${res.brandName} (${res.sku}) has been created`);
      navigate(`/medicines/${res.id}`);
    },
    onError: (err: any) => {
      toastError('Creation Failed', err.message || 'Please check form fields and try again');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      brandName: formData.brandName.trim(),
      genericName: formData.genericName.trim(),
      sku: formData.sku.trim().toUpperCase(),
      categoryId: Number(formData.categoryId),
      manufacturerId: Number(formData.manufacturerId),
      dosageFormId: Number(formData.dosageFormId),
      administrationRouteId: formData.administrationRouteId
        ? Number(formData.administrationRouteId)
        : undefined,
      measurementUnitId: formData.measurementUnitId
        ? Number(formData.measurementUnitId)
        : undefined,
      strength: formData.strength.trim(),
      primaryBarcode: formData.primaryBarcode.trim() || undefined,
      packagingType: formData.packagingType,
      baseUnit: formData.baseUnit.trim().toUpperCase(),
      packName: formData.packName.trim() || undefined,
      unitsPerPack: Number(formData.unitsPerPack),
      minStockLevel: Number(formData.minStockLevel),
      storageInstructions: formData.storageInstructions.trim() || undefined,
      hsnCode: formData.hsnCode.trim() || undefined,
      gstRate: Number(formData.gstRate),
      regulatoryClass: formData.regulatoryClass || undefined,
      prescriptionRequired: formData.prescriptionRequired,
      isActive: formData.isActive,
      notes: formData.notes.trim() || undefined,
      compositions: compositions.filter((c) => c.compositionName.trim().length > 0),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/medicines')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Catalogue
        </Button>
      </div>

      <PageHeader
        title="Add New Medicine"
        description="Register a new formulation and master record into the medical inventory"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Identification */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">
            1. Core Identification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Brand / Trade Name *"
              id="brandName"
              placeholder="e.g. Augmentin 625 Duo"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              error={formErrors.brandName}
            />

            <Input
              label="Generic / INN Name *"
              id="genericName"
              placeholder="e.g. Amoxicillin and Potassium Clavulanate"
              value={formData.genericName}
              onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
              error={formErrors.genericName}
            />

            <Input
              label="Internal SKU / Item Code *"
              id="sku"
              placeholder="e.g. MED-AUG-625"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              error={formErrors.sku}
              hint="Must be unique across the entire medicine catalogue"
            />

            <Input
              label="Primary Barcode (EAN / UPC / GTIN)"
              id="primaryBarcode"
              placeholder="e.g. 8901234567890"
              value={formData.primaryBarcode}
              onChange={(e) => setFormData({ ...formData, primaryBarcode: e.target.value })}
              hint="USB or camera barcode scanner can populate this field"
            />
          </div>
        </div>

        {/* Classification & Formulation */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">
            2. Classification & Formulation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Category *</label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <span className="text-xs text-red-600">{formErrors.categoryId}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Manufacturer *</label>
              <select
                id="manufacturerId"
                value={formData.manufacturerId}
                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select Manufacturer</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {formErrors.manufacturerId && (
                <span className="text-xs text-red-600">{formErrors.manufacturerId}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Dosage Form *</label>
              <select
                id="dosageFormId"
                value={formData.dosageFormId}
                onChange={(e) => setFormData({ ...formData, dosageFormId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select Dosage Form</option>
                {dosageForms.map((df) => (
                  <option key={df.id} value={df.id}>
                    {df.name}
                  </option>
                ))}
              </select>
              {formErrors.dosageFormId && (
                <span className="text-xs text-red-600">{formErrors.dosageFormId}</span>
              )}
            </div>

            <Input
              label="Strength / Potency *"
              id="strength"
              placeholder="e.g. 500mg+125mg or 100ml"
              value={formData.strength}
              onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              error={formErrors.strength}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Administration Route</label>
              <select
                id="administrationRouteId"
                value={formData.administrationRouteId}
                onChange={(e) =>
                  setFormData({ ...formData, administrationRouteId: e.target.value })
                }
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select Route (Optional)</option>
                {adminRoutes.map((ar) => (
                  <option key={ar.id} value={ar.id}>
                    {ar.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Measurement Unit</label>
              <select
                id="measurementUnitId"
                value={formData.measurementUnitId}
                onChange={(e) => setFormData({ ...formData, measurementUnitId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="">Select Unit (Optional)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Packaging & Unit Conversions */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">
            3. Packaging & Unit Conversions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Packaging Type</label>
              <select
                id="packagingType"
                value={formData.packagingType}
                onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="STRIP">Strip</option>
                <option value="BOTTLE">Bottle</option>
                <option value="BOX">Box</option>
                <option value="VIAL">Vial</option>
                <option value="PACK">Pack</option>
                <option value="UNIT">Single Unit</option>
              </select>
            </div>

            <Input
              label="Base Unit *"
              id="baseUnit"
              placeholder="TABLET, CAPSULE, ML"
              value={formData.baseUnit}
              onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
              error={formErrors.baseUnit}
              hint="Smallest dispensing unit in store ledger"
            />

            <Input
              label="Units Per Pack *"
              type="number"
              min="1"
              id="unitsPerPack"
              value={formData.unitsPerPack}
              onChange={(e) => setFormData({ ...formData, unitsPerPack: Number(e.target.value) })}
              error={formErrors.unitsPerPack}
              hint="e.g. 10 tablets in 1 strip"
            />

            <Input
              label="Pack Display Name"
              id="packName"
              placeholder="e.g. 10 Tablets Strip"
              value={formData.packName}
              onChange={(e) => setFormData({ ...formData, packName: e.target.value })}
            />

            <Input
              label="Minimum Stock Threshold *"
              type="number"
              min="0"
              id="minStockLevel"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
              error={formErrors.minStockLevel}
              hint="Alert triggered when available stock drops below this"
            />
          </div>
        </div>

        {/* Regulatory & Taxes */}
        <div className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-navy-900 border-b pb-2">
            4. Regulatory, Tax & Storage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="HSN Code"
              id="hsnCode"
              placeholder="e.g. 3004"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
            />

            <Input
              label="GST Rate (%)"
              type="number"
              min="0"
              max="28"
              id="gstRate"
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Regulatory Class</label>
              <select
                id="regulatoryClass"
                value={formData.regulatoryClass}
                onChange={(e) => setFormData({ ...formData, regulatoryClass: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="GENERAL">General OTC</option>
                <option value="SCHEDULE_H">Schedule H</option>
                <option value="SCHEDULE_H1">Schedule H1</option>
                <option value="SCHEDULE_X">Schedule X</option>
                <option value="NARCOTIC">Narcotic</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <Input
                label="Storage Instructions"
                id="storageInstructions"
                value={formData.storageInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, storageInstructions: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-3 md:col-span-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  id="prescriptionRequired"
                  checked={formData.prescriptionRequired}
                  onChange={(e) =>
                    setFormData({ ...formData, prescriptionRequired: e.target.checked })
                  }
                  className="w-4 h-4 text-brand-600 rounded"
                />
                Requires Doctor's Prescription (Rx)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800 ml-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                Active Status
              </label>
            </div>
          </div>
        </div>

        {/* Salt / Active Compositions */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-semibold text-navy-900">
              5. Salt Compositions (Optional)
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddComposition}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Salt
            </Button>
          </div>

          {compositions.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No salt compositions added. Click "Add Salt" to record active molecules (e.g.
              Paracetamol 500mg).
            </p>
          ) : (
            <div className="space-y-3">
              {compositions.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Salt Name (e.g. Amoxicillin)"
                    value={comp.compositionName}
                    onChange={(e) =>
                      handleCompositionChange(idx, 'compositionName', e.target.value)
                    }
                    className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Strength (e.g. 500)"
                    value={comp.strength}
                    onChange={(e) => handleCompositionChange(idx, 'strength', e.target.value)}
                    className="w-32 text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g. mg)"
                    value={comp.unit}
                    onChange={(e) => handleCompositionChange(idx, 'unit', e.target.value)}
                    className="w-24 text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveComposition(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/medicines')}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            id="btn-submit-medicine"
          >
            <Save className="w-4 h-4 mr-1" /> Create Medicine Record
          </Button>
        </div>
      </form>
    </div>
  );
}

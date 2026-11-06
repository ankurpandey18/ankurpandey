import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { importsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, PageHeader, Spinner } from '../../components/ui';

export function ImportExportPage() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // CSV Text state
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (text: string) => importsApi.previewMedicines(text),
    onSuccess: (res) => {
      setPreviewData(res);
      success(
        'Validation Complete',
        `Parsed ${res.totalRows} rows: ${res.validCount} valid, ${res.invalidCount} errors`,
      );
    },
    onError: (err: any) => {
      toastError('Preview Failed', err.message);
    },
  });

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: (rows: any[]) => importsApi.commitMedicines(rows),
    onSuccess: (res) => {
      success('Import Successful', `Successfully imported ${res.importedCount} medicines`);
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setCsvText('');
      setPreviewData(null);
    },
    onError: (err: any) => {
      toastError('Import Failed', err.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toastError('Invalid File', 'Only CSV files (.csv) are accepted');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      previewMutation.mutate(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = `brandName,genericName,sku,categoryName,manufacturerName,dosageFormName,strength,unitsPerPack,baseUnit,minStockLevel,mrp,purchasePrice,sellingPrice\n"Amoxil 250mg","Amoxicillin","MED-AMX-250","Antibiotics","GlaxoSmithKline Pharmaceuticals","Capsule","250mg",10,"CAPSULE",20,85.00,55.00,75.00\n"Panadol 500","Paracetamol","MED-PAN-500","Analgesics & Pain Relief","Cipla Ltd","Tablet","500mg",10,"TABLET",50,30.00,18.00,25.00`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_medicine_import.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportInventory = () => {
    window.open('/api/v1/imports/inventory/export', '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Medicine Data Import & Export"
        description="Dry-run preview validated CSV imports and safe inventory reporting"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          CSV Medicine Import
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Inventory Export
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Upload card */}
          <div className="card p-6 border-dashed border-2 border-slate-300 space-y-4">
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-10 h-10 text-brand-600 mb-2" />
              <h3 className="text-base font-semibold text-navy-900">
                Upload Medicine Master CSV File
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Upload a structured CSV containing brand name, generic formulation, SKU,
                manufacturer, dosage form, packaging, and reorder thresholds.
              </p>

              <div className="flex items-center gap-3 mt-4">
                <label className="btn-primary cursor-pointer px-4 py-2 text-sm rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700">
                  Select CSV File
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <Button variant="secondary" size="sm" onClick={handleDownloadSample}>
                  <Download className="w-4 h-4 mr-1" /> Download Sample CSV
                </Button>
              </div>
            </div>

            {/* Direct CSV Text Area */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Or Paste CSV Data Directly
                </label>
                {csvText && (
                  <button
                    onClick={() => {
                      setCsvText('');
                      setPreviewData(null);
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full font-mono text-xs border border-slate-300 rounded-lg p-2.5"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={() => csvText && previewMutation.mutate(csvText)}
                  isLoading={previewMutation.isPending}
                  disabled={!csvText.trim()}
                >
                  Validate & Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Validation & Preview Results */}
          {previewData && (
            <div className="card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Import Dry-Run Preview</h3>
                  <p className="text-xs text-slate-500">
                    Total Rows: <b>{previewData.totalRows}</b> &middot; Valid:{' '}
                    <b className="text-emerald-700">{previewData.validCount}</b> &middot; Invalid:{' '}
                    <b className="text-red-600">{previewData.invalidCount}</b>
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => commitMutation.mutate(previewData.validRows)}
                  isLoading={commitMutation.isPending}
                  disabled={previewData.validCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Commit Import ({previewData.validCount}{' '}
                  Rows)
                </Button>
              </div>

              {/* Rows List */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Brand Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Manufacturer</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Errors / Messages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewData.rows?.map((r: any) => (
                      <tr
                        key={r.rowNumber}
                        className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/40'}
                      >
                        <td className="py-2 px-3 font-bold">#{r.rowNumber}</td>
                        <td className="py-2 px-3">{r.sku || '—'}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                          {r.brandName || '—'}
                        </td>
                        <td className="py-2 px-3 font-sans">{r.categoryName || '—'}</td>
                        <td className="py-2 px-3 font-sans">{r.manufacturerName || '—'}</td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              VALID
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold">
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-sans text-red-600">
                          {r.errors?.join(', ') || 'Ready for import'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-navy-900">Export Complete Store Inventory</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Generates a sanitized CSV export containing all physical stock balances, batch
                numbers, expiry dates, locations, MRP, and cost pricing. Protected against formula
                injection.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  onClick={handleExportInventory}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4 mr-1" /> Download Inventory CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

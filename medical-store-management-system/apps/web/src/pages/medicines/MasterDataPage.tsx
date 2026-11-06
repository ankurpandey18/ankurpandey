import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Layers, Building2, Pill, Activity, ShieldCheck } from 'lucide-react';
import { masterDataApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Input, PageHeader, Spinner, Badge } from '../../components/ui';

export function MasterDataPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'categories' | 'manufacturers' | 'dosageForms'>(
    'categories',
  );

  // New item modal states
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [newMfrName, setNewMfrName] = useState('');
  const [newMfrCode, setNewMfrCode] = useState('');

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['masterData', 'categories'],
    queryFn: () => masterDataApi.categories(true),
  });

  const { data: manufacturers = [], isLoading: mfrLoading } = useQuery({
    queryKey: ['masterData', 'manufacturers'],
    queryFn: () => masterDataApi.manufacturers(true),
  });

  const { data: dosageForms = [], isLoading: dfLoading } = useQuery({
    queryKey: ['masterData', 'dosageForms'],
    queryFn: () => masterDataApi.dosageForms(),
  });

  // Category creation
  const addCategoryMutation = useMutation({
    mutationFn: () =>
      masterDataApi.createCategory({
        name: newCatName.trim(),
        code: (newCatName.trim().slice(0, 4) + Math.floor(Math.random() * 899 + 100)).toUpperCase(),
        description: newCatDesc.trim() || undefined,
      }),
    onSuccess: () => {
      success('Category created');
      queryClient.invalidateQueries({ queryKey: ['masterData', 'categories'] });
      setNewCatName('');
      setNewCatDesc('');
    },
    onError: (err: any) => toastError('Failed', err.message),
  });

  // Manufacturer creation
  const addManufacturerMutation = useMutation({
    mutationFn: () => {
      const generatedCode = (newMfrName.trim().slice(0, 4) + Math.floor(Math.random() * 899 + 100)).toUpperCase();
      return masterDataApi.createManufacturer({
        name: newMfrName.trim(),
        code: newMfrCode.trim() ? newMfrCode.trim().toUpperCase() : generatedCode,
      });
    },
    onSuccess: () => {
      success('Manufacturer created');
      queryClient.invalidateQueries({ queryKey: ['masterData', 'manufacturers'] });
      setNewMfrName('');
      setNewMfrCode('');
    },
    onError: (err: any) => toastError('Failed', err.message),
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/medicines')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Catalogue
        </Button>
      </div>

      <PageHeader
        title="Inventory Master Data"
        description="Configure pharmaceutical categories, registered manufacturers, and dosage forms"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('manufacturers')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'manufacturers'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Manufacturers ({manufacturers.length})
        </button>
        <button
          onClick={() => setActiveTab('dosageForms')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'dosageForms'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Dosage Forms ({dosageForms.length})
        </button>
      </div>

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="card p-4 bg-slate-50 border border-slate-200 flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Input
                label="New Category Name *"
                placeholder="e.g. Antidiabetic"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full">
              <Input
                label="Description"
                placeholder="Description of pharmacological class"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => newCatName && addCategoryMutation.mutate()}
              isLoading={addCategoryMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs">{c.description || '—'}</td>
                    <td className="py-2.5 px-4">
                      {c.isActive ? (
                        <Badge variant="active">Active</Badge>
                      ) : (
                        <Badge variant="inactive">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manufacturers View */}
      {activeTab === 'manufacturers' && (
        <div className="space-y-4">
          <div className="card p-4 bg-slate-50 border border-slate-200 flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Input
                label="Manufacturer Name *"
                placeholder="e.g. Sun Pharmaceutical Industries Ltd"
                value={newMfrName}
                onChange={(e) => setNewMfrName(e.target.value)}
              />
            </div>
            <div className="flex-1 w-full">
              <Input
                label="Short Code / Acronym"
                placeholder="e.g. SUNPHARMA"
                value={newMfrCode}
                onChange={(e) => setNewMfrCode(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => newMfrName && addManufacturerMutation.mutate()}
              isLoading={addManufacturerMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Manufacturer
            </Button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Manufacturer Name</th>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manufacturers.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{m.name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                      {m.code || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      {m.isActive ? (
                        <Badge variant="active">Active</Badge>
                      ) : (
                        <Badge variant="inactive">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dosage Forms View */}
      {activeTab === 'dosageForms' && (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="py-2.5 px-4">Dosage Form</th>
                <th className="py-2.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dosageForms.map((df) => (
                <tr key={df.id}>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{df.name}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs">{df.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

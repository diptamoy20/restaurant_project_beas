import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/TextField';
import { SelectField } from '../components/ui/SelectField';
import { SupplierForm } from '../components/SupplierForm';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Supplier create/edit modal
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Pricing modal
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [mappedPrices, setMappedPrices] = useState([]);
  const [pricingIngId, setPricingIngId] = useState('');
  const [pricingPrice, setPricingPrice] = useState('');
  const [pricingEffectiveDate, setPricingEffectiveDate] = useState('');
  const [pricingStatus, setPricingStatus] = useState('ACTIVE');
  const [deletingPriceId, setDeletingPriceId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [supRes, ingRes] = await Promise.all([
        apiFetch('suppliers'),
        apiFetch('master/ingredients'),
      ]);
      setSuppliers(Array.isArray(supRes) ? supRes : []);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setSupplierFormOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormOpen(true);
  };

  const handleSupplierFormSuccess = (saved) => {
    setSupplierFormOpen(false);
    setEditingSupplier(null);
    fetchData();
  };

  const handleSupplierFormClose = () => {
    setSupplierFormOpen(false);
    setEditingSupplier(null);
  };

  const handleToggleActive = async (supplier) => {
    try {
      if (!supplier.poPrefix && !supplier.isActive) {
        alert('Cannot activate a supplier without a PO prefix. Set a PO prefix first.');
        return;
      }
      await apiFetch(`suppliers/${supplier.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update supplier status.');
    }
  };

  const openPricingModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setPriceModalOpen(true);
    setPricingIngId(ingredients.length > 0 ? String(ingredients[0].id) : '');
    setPricingPrice('');
    setPricingEffectiveDate(new Date().toISOString().split('T')[0]);
    setPricingStatus('ACTIVE');
    try {
      const res = await apiFetch(`suppliers/${supplier.id}/pricing`);
      setMappedPrices(Array.isArray(res) ? res : []);
    } catch (err) {
      alert(err.message || 'Failed to load supplier price mappings.');
      setMappedPrices([]);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await apiFetch(`suppliers/${selectedSupplier.id}/pricing`, {
        method: 'POST',
        body: JSON.stringify({
          ingredientId: Number(pricingIngId),
          price: Number(pricingPrice),
          effectiveDate: pricingEffectiveDate || undefined,
          status: pricingStatus,
        }),
      });
      setPricingPrice('');
      const res = await apiFetch(`suppliers/${selectedSupplier.id}/pricing`);
      setMappedPrices(Array.isArray(res) ? res : []);
    } catch (err) {
      alert(err.message || 'Failed to save price mapping.');
    }
  };

  const handleDeletePrice = async (priceId) => {
    if (!selectedSupplier) return;
    setDeletingPriceId(priceId);
    try {
      await apiFetch(`suppliers/${selectedSupplier.id}/pricing/${priceId}`, { method: 'DELETE' });
      const res = await apiFetch(`suppliers/${selectedSupplier.id}/pricing`);
      setMappedPrices(Array.isArray(res) ? res : []);
    } catch (err) {
      alert(err.message || 'Failed to remove price mapping.');
    } finally {
      setDeletingPriceId(null);
    }
  };

  if (loading && suppliers.length === 0) return <Loader label="Loading suppliers registry..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Code', key: 'supplierCode', render: (row) => <span className="font-semibold text-slate-800">{row.supplierCode}</span> },
    { header: 'Company', key: 'companyName', render: (row) => <span className="text-slate-700">{row.companyName}</span> },
    { header: 'Contact', key: 'contactPerson' },
    { header: 'Mobile', key: 'mobile' },
    { header: 'Email', key: 'email' },
    { header: 'PO Prefix', key: 'poPrefix', render: (row) => row.poPrefix || <span className="text-xs text-rose-400 italic">None</span> },
    { header: 'Prices', key: 'priceCount', render: (row) => (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        {row.ingredientPrices?.length || 0}
      </span>
    )},
    { header: 'Status', key: 'isActive', render: (row) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { header: 'Actions', key: 'actions', render: (row) => (
      <div className="flex gap-1.5">
        <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => openEditModal(row)}>Edit</Button>
        <Button variant="secondary" className={`py-1 px-2.5 text-xs ${row.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => handleToggleActive(row)}>
          {row.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => openPricingModal(row)}>Prices</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Registry</h1>
          <p className="text-sm text-slate-500">Manage vendor profiles, status, and ingredient price agreements.</p>
        </div>
        <Button onClick={openCreateModal}>Add New Supplier</Button>
      </div>

      <Card title="Registered Suppliers" eyebrow="Procurement Contacts">
        <Table columns={columns} data={suppliers} emptyMessage="No suppliers registered yet." />
      </Card>

      {/* Supplier Create/Edit Form */}
      <SupplierForm
        open={supplierFormOpen}
        editingSupplier={editingSupplier}
        onSuccess={handleSupplierFormSuccess}
        onClose={handleSupplierFormClose}
      />

      {/* Pricing Mapping Modal */}
      <Modal open={priceModalOpen} title={`Price Agreements — ${selectedSupplier?.companyName || ''}`} onClose={() => setPriceModalOpen(false)} maxWidth="max-w-3xl">
        <div className="space-y-6">
          <form onSubmit={handleSavePrice} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Ingredient"
                value={pricingIngId}
                onChange={(e) => setPricingIngId(e.target.value)}
                options={ingredients.map((i) => ({ label: `${i.name} (${i.sku})`, value: String(i.id) }))}
                required
              />
              <TextField
                label="Price per Unit (Rs.)"
                type="number"
                step="any"
                value={pricingPrice}
                onChange={(e) => setPricingPrice(e.target.value)}
                placeholder="e.g. 120"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Effective Date"
                type="date"
                value={pricingEffectiveDate}
                onChange={(e) => setPricingEffectiveDate(e.target.value)}
              />
              <SelectField
                label="Status"
                value={pricingStatus}
                onChange={(e) => setPricingStatus(e.target.value)}
                options={[
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Inactive', value: 'INACTIVE' },
                ]}
              />
            </div>
            <Button type="submit" className="h-10">Save Price Agreement</Button>
          </form>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">Current Price Agreements</h4>
            <Table
              columns={[
                { header: 'SKU', key: 'sku', render: (row) => row.ingredient?.sku },
                { header: 'Material', key: 'name', render: (row) => row.ingredient?.name },
                { header: 'Unit', key: 'unit', render: (row) => row.ingredient?.unit },
                { header: 'Price', key: 'price', render: (row) => <span className="font-semibold text-slate-800">Rs. {Number(row.price).toFixed(2)}</span> },
                { header: 'Effective', key: 'effectiveDate', render: (row) => row.effectiveDate ? new Date(row.effectiveDate).toLocaleDateString() : '—' },
                { header: 'Status', key: 'status', render: (row) => (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${(row.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {row.status || 'ACTIVE'}
                  </span>
                )},
                { header: '', key: 'delete', render: (row) => (
                  <button
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                    onClick={() => handleDeletePrice(row.id)}
                    disabled={deletingPriceId === row.id}
                  >
                    {deletingPriceId === row.id ? '...' : 'Remove'}
                  </button>
                )},
              ]}
              data={mappedPrices}
              emptyMessage="No price agreements mapped for this supplier."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

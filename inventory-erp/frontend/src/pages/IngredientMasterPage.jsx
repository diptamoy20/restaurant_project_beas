import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/TextField';
import { SelectField } from '../components/ui/SelectField';

export function IngredientMasterPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('KG');
  const [minStock, setMinStock] = useState(10);
  const [maxStock, setMaxStock] = useState(100);
  const [reorderLevel, setReorderLevel] = useState(25);
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ingRes, catRes] = await Promise.all([
        apiFetch('master/ingredients'),
        apiFetch('master/categories'),
      ]);
      setItems(ingRes);
      setCategories(catRes);
      if (catRes.length > 0) setCategoryId(catRes[0].id);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load master ingredients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await apiFetch('master/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          sku,
          name,
          categoryId: Number(categoryId),
          unit,
          minimumStock: Number(minStock),
          maximumStock: Number(maxStock),
          reorderLevel: Number(reorderLevel),
          isActive: true,
        }),
      });
      setModalOpen(false);
      // reset form
      setSku('');
      setName('');
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create ingredient catalog item.');
    }
  };

  if (loading && items.length === 0) return <Loader label="Loading raw ingredients master catalog..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'SKU Code', key: 'sku' },
    { header: 'Ingredient Name', key: 'name' },
    { header: 'Category', key: 'category', render: (row) => row.category?.name || 'Unassigned' },
    { header: 'UOM Unit', key: 'unit' },
    { header: 'Min Safety Stock', key: 'minimumStock' },
    { header: 'Max Capacity', key: 'maximumStock' },
    { header: 'Reorder Level', key: 'reorderLevel' },
    { header: 'Status', key: 'isActive', render: (row) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ingredient Master</h1>
          <p className="text-sm text-slate-500">Manage definitions and target safety stocks of raw materials.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Add New Ingredient</Button>
      </div>

      <Card title="Raw Material Catalog" eyebrow="Ingredient Definitions">
        <Table columns={columns} data={items} emptyMessage="No raw ingredients found. Add one or seed demo data from dashboard." />
      </Card>

      <Modal open={modalOpen} title="Define New Master Ingredient" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField label="SKU Code" name="sku" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="ING-CHICKEN" required />
            <TextField label="Ingredient Name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fresh Chicken" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Inventory Category"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
              required
            />
            <SelectField
              label="Unit of Measure"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={[
                { label: 'KG (Kilograms)', value: 'KG' },
                { label: 'GM (Grams)', value: 'GM' },
                { label: 'L (Liters)', value: 'L' },
                { label: 'ML (Milliliters)', value: 'ML' },
                { label: 'Piece (Units)', value: 'Piece' },
                { label: 'Packet', value: 'Packet' },
                { label: 'Bottle', value: 'Bottle' },
                { label: 'Box', value: 'Box' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <TextField label="Min Safety Stock" type="number" step="any" value={minStock} onChange={(e) => setMinStock(e.target.value)} required />
            <TextField label="Max Stock Capacity" type="number" step="any" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} required />
            <TextField label="Reorder Threshold" type="number" step="any" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} required />
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Define Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

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
import { useSelector } from 'react-redux';

export function WastePage() {
  const [wasteLogs, setWasteLogs] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restaurantId = useSelector((state) => state.restaurant.restaurantId);

  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wasteType, setWasteType] = useState('SPOILAGE');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wasteRes, ingRes] = await Promise.all([
        apiFetch(`reporting/waste?restaurantId=${restaurantId}`),
        apiFetch('master/ingredients'),
      ]);
      setWasteLogs(wasteRes);
      setIngredients(ingRes);
      if (ingRes.length > 0) setIngredientId(ingRes[0].id);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load waste logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleLogWaste = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await apiFetch('reporting/waste', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: Number(restaurantId),
          ingredientId: Number(ingredientId),
          quantity: Number(quantity),
          wasteType,
          notes: notes || null,
        }),
      });
      setModalOpen(false);
      setQuantity(1);
      setNotes('');
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to log waste.');
    }
  };

  if (loading && wasteLogs.length === 0) return <Loader label="Loading waste management data..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Ingredient', key: 'ingredient', render: (row) => row.ingredient?.name || 'N/A' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Waste Type', key: 'wasteType', render: (row) => {
      const colors = {
        SPOILAGE: 'bg-rose-100 text-rose-800',
        EXPIRED: 'bg-amber-100 text-amber-800',
        COOKING_WASTE: 'bg-orange-100 text-orange-800',
        DAMAGED_STOCK: 'bg-purple-100 text-purple-800',
      };
      return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[row.wasteType] || 'bg-slate-100 text-slate-800'}`}>
          {(row.wasteType || 'UNKNOWN').replace('_', ' ')}
        </span>
      );
    }},
    { header: 'Notes', key: 'notes', render: (row) => row.notes || '—' },
    { header: 'Logged By', key: 'loggedBy', render: (row) => row.loggedBy?.name || 'N/A' },
    { header: 'Date', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waste Management</h1>
          <p className="text-sm text-slate-500">Track ingredient wastage from spoilage, expiry, cooking waste, or damaged stock.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Log Waste</Button>
      </div>

      <Card title="Waste Log History" eyebrow="Inventory Losses">
        <Table columns={columns} data={wasteLogs} emptyMessage="No waste records logged yet." />
      </Card>

      <Modal open={modalOpen} title="Log Ingredient Waste" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleLogWaste} className="space-y-4">
          <SelectField
            label="Waste Type"
            value={wasteType}
            onChange={(e) => setWasteType(e.target.value)}
            options={[
              { label: 'Spoilage', value: 'SPOILAGE' },
              { label: 'Expired', value: 'EXPIRED' },
              { label: 'Cooking Waste', value: 'COOKING_WASTE' },
              { label: 'Damaged Stock', value: 'DAMAGED_STOCK' },
            ]}
            required
          />

          <SelectField
            label="Ingredient"
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            options={ingredients.map((i) => ({ label: `${i.name} (${i.sku})`, value: i.id }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField label="Wasted Quantity" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Tomatoes spoiled" />
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Log Waste</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

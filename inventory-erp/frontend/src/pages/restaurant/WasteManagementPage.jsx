import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/TextField';
import { SelectField } from '../../components/ui/SelectField';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const WASTE_TYPES = [
  { value: 'SPOILAGE', label: 'Spoilage' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'COOKING_WASTE', label: 'Cooking Waste' },
  { value: 'DAMAGED_STOCK', label: 'Damaged Stock' },
];

const WASTE_TYPE_STYLES = {
  SPOILAGE: 'bg-rose-100 text-rose-800',
  EXPIRED: 'bg-amber-100 text-amber-800',
  COOKING_WASTE: 'bg-orange-100 text-orange-800',
  DAMAGED_STOCK: 'bg-purple-100 text-purple-800',
};

export function WasteManagementPage() {
  const { slug } = useParams();
  const [wasteLogs, setWasteLogs] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wasteType, setWasteType] = useState('SPOILAGE');
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, ingRes] = await Promise.all([
        apiFetch(`operations/${slug}/waste`),
        apiFetch('master/ingredients'),
      ]);
      setWasteLogs(Array.isArray(res) ? res : res.wasteLogs || res.waste || []);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await apiFetch(`operations/${slug}/waste`, {
        method: 'POST',
        body: JSON.stringify({ wasteType, ingredientId, quantity: Number(quantity), notes }),
      });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setWasteType('SPOILAGE');
    setIngredientId('');
    setQuantity('');
    setNotes('');
  };

  const ingredientOptions = ingredients.map((ing) => ({
    value: ing.id,
    label: ing.name,
  }));

  const columns = [
    { key: 'ingredient', header: 'Ingredient', render: (row) => (
      <span className="font-semibold text-slate-900">{row.ingredient}</span>
    )},
    { key: 'quantity', header: 'Quantity', render: (row) => (
      <span className="font-semibold text-rose-600">{row.quantity}</span>
    )},
    { key: 'wasteType', header: 'Waste Type', render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${WASTE_TYPE_STYLES[row.wasteType] || 'bg-slate-100 text-slate-800'}`}>
        {row.wasteType?.replace('_', ' ')}
      </span>
    )},
    { key: 'notes', header: 'Notes', render: (row) => (
      <span className="text-slate-600">{row.notes || '—'}</span>
    )},
    { key: 'loggedBy', header: 'Logged By', render: (row) => (
      <span className="text-slate-600">{row.loggedBy || row.user || '—'}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (row) => (
      <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
    )},
  ];

  if (loading) return <Loader label="Loading waste logs..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
          <h1 className="text-2xl font-bold text-slate-900">Waste Management</h1>
          <p className="text-sm text-slate-500">Track ingredient wastage from spoilage, expiry, cooking waste, or damaged stock</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Log Waste</Button>
      </div>

      <Card>
        {wasteLogs.length === 0 ? (
          <EmptyState message="No waste logs recorded yet." />
        ) : (
          <Table columns={columns} data={wasteLogs} emptyMessage="No waste logs found." />
        )}
      </Card>

      <Modal
        open={showModal}
        title="Log Waste"
        onClose={() => { setShowModal(false); resetForm(); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !ingredientId || !quantity}>
              {submitting ? 'Logging...' : 'Log Waste'}
            </Button>
          </>
        }
      >
        <SelectField
          label="Waste Type"
          options={WASTE_TYPES}
          value={wasteType}
          onChange={(e) => setWasteType(e.target.value)}
        />
        <SelectField
          label="Ingredient"
          required
          options={[{ value: '', label: 'Select ingredient...' }, ...ingredientOptions]}
          value={ingredientId}
          onChange={(e) => setIngredientId(e.target.value)}
        />
        <TextField
          label="Quantity"
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <TextField
          label="Notes"
          placeholder="Optional notes about this waste entry..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
}

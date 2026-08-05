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

export function KitchenTransfersPage() {
  const { slug } = useParams();
  const [transfers, setTransfers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ingredientId: '', quantity: '' }]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, ingRes] = await Promise.all([
        apiFetch(`operations/${slug}/kitchen-transfers`),
        apiFetch('master/ingredients'),
      ]);
      setTransfers(Array.isArray(res) ? res : res.transfers || []);
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

  const handleDispatch = async (id) => {
    try {
      await apiFetch(`operations/${slug}/kitchen-transfers/${id}/dispatch`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await apiFetch(`operations/${slug}/kitchen-transfers/${id}/reject`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await apiFetch(`operations/${slug}/kitchen-transfers`, {
        method: 'POST',
        body: JSON.stringify({ notes, items: items.filter(i => i.ingredientId && i.quantity) }),
      });
      setShowModal(false);
      setNotes('');
      setItems([{ ingredientId: '', quantity: '' }]);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => setItems([...items, { ingredientId: '', quantity: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const ingredientOptions = ingredients.map((ing) => ({
    value: ing.id,
    label: ing.name,
  }));

  const requestNumberFromNotes = (notes) => {
    if (!notes) return '—';
    const match = notes.match(/kitchen request (KR-[\w-]+)/);
    return match ? match[1] : '—';
  };

  const columns = [
    { key: 'transferNumber', header: 'Transfer #', render: (row) => (
      <span className="font-semibold text-slate-900">{row.transferNumber}</span>
    )},
    { key: 'requestNumber', header: 'Request #', render: (row) => (
      <span className="text-xs font-mono text-slate-500">{requestNumberFromNotes(row.notes)}</span>
    )},
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'items', header: 'Items', render: (row) => (
      <span className="text-slate-600">{row.itemCount ?? row.items?.length ?? 0}</span>
    )},
    { key: 'notes', header: 'Notes', render: (row) => (
      <span className="text-xs text-slate-500">{row.notes || '—'}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (row) => (
      <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
    )},
    { key: 'actions', header: 'Actions', render: (row) => (
      row.status === 'PENDING' ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleDispatch(row.id)}>
            Dispatch
          </Button>
          <Button variant="secondary" onClick={() => handleReject(row.id)}>
            Reject
          </Button>
        </div>
      ) : null
    )},
  ];

  if (loading) return <Loader label="Loading kitchen transfers..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
          <h1 className="text-2xl font-bold text-slate-900">Kitchen Transfers</h1>
          <p className="text-sm text-slate-500">Transfer ingredients from Store Room to Kitchen stations</p>
        </div>
        <Button onClick={() => setShowModal(true)}>New Transfer Request</Button>
      </div>

      <Card>
        {transfers.length === 0 ? (
          <EmptyState message="No kitchen transfers yet." />
        ) : (
          <Table columns={columns} data={transfers} emptyMessage="No kitchen transfers found." />
        )}
      </Card>

      <Modal
        open={showModal}
        title="New Kitchen Transfer"
        onClose={() => { setShowModal(false); setNotes(''); setItems([{ ingredientId: '', quantity: '' }]); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || items.every(i => !i.ingredientId)}>
              {submitting ? 'Submitting...' : 'Submit Transfer'}
            </Button>
          </>
        }
      >
        <TextField
          label="Notes"
          placeholder="Optional notes for the store manager..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Ingredients</p>
          {items.map((item, index) => (
            <div key={index} className="flex items-end gap-3">
              <SelectField
                label={index === 0 ? 'Ingredient' : undefined}
                className="flex-1"
                options={[{ value: '', label: 'Select ingredient...' }, ...ingredientOptions]}
                value={item.ingredientId}
                onChange={(e) => updateItem(index, 'ingredientId', e.target.value)}
              />
              <TextField
                label={index === 0 ? 'Qty' : undefined}
                className="w-24"
                type="number"
                min="0"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="mb-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-semibold text-slate-900 hover:text-slate-700"
          >
            + Add item
          </button>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    COMPLETED: 'bg-slate-100 text-slate-800',
    REJECTED: 'bg-rose-100 text-rose-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
      {status}
    </span>
  );
}

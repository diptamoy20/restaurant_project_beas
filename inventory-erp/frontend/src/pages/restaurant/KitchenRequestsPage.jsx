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

export function KitchenRequestsPage() {
  const { slug } = useParams();
  const [requests, setRequests] = useState([]);
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
        apiFetch(`operations/${slug}/kitchen-requests`),
        apiFetch('master/ingredients'),
      ]);
      setRequests(Array.isArray(res) ? res : res.requests || []);
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

  const handleApprove = async (id) => {
    try {
      await apiFetch(`operations/${slug}/kitchen-requests/${id}/approve`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await apiFetch(`operations/${slug}/kitchen-requests/${id}/reject`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await apiFetch(`operations/${slug}/kitchen-requests`, {
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

  const columns = [
    { key: 'requestNumber', header: 'Request #', render: (row) => (
      <span className="flex items-center gap-2">
        <span className="font-semibold text-slate-900">{row.requestNumber}</span>
        {row.requestSource && (
          <SourceBadge source={row.requestSource} />
        )}
      </span>
    )},
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'requestedBy', header: 'Requested By', render: (row) => (
      <span className="text-slate-600">{row.requestedBy?.name || '—'}</span>
    )},
    { key: 'items', header: 'Items', render: (row) => (
      <span className="text-slate-600">{row.itemCount ?? row.items?.length ?? 0}</span>
    )},
    { key: 'createdAt', header: 'Date', render: (row) => (
      <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
    )},
    { key: 'actions', header: 'Actions', render: (row) => (
      row.status === 'PENDING' ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleApprove(row.id)}>
            Approve
          </Button>
          <Button variant="secondary" onClick={() => handleReject(row.id)}>
            Reject
          </Button>
        </div>
      ) : null
    )},
  ];

  if (loading) return <Loader label="Loading kitchen requests..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
          <h1 className="text-2xl font-bold text-slate-900">Kitchen Requests</h1>
          <p className="text-sm text-slate-500">Kitchen staff requests ingredients from the store room</p>
        </div>
        <Button onClick={() => setShowModal(true)}>New Kitchen Request</Button>
      </div>

      <Card>
        {requests.length === 0 ? (
          <EmptyState message="No kitchen requests yet." />
        ) : (
          <Table columns={columns} data={requests} emptyMessage="No kitchen requests found." />
        )}
      </Card>

      <Modal
        open={showModal}
        title="New Kitchen Request"
        onClose={() => { setShowModal(false); setNotes(''); setItems([{ ingredientId: '', quantity: '' }]); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || items.every(i => !i.ingredientId)}>
              {submitting ? 'Submitting...' : 'Submit Request'}
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
    TRANSFERRED: 'bg-sky-100 text-sky-800',
    COMPLETED: 'bg-slate-100 text-slate-800',
    REJECTED: 'bg-rose-100 text-rose-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
      {status}
    </span>
  );
}

function SourceBadge({ source }) {
  const isAuto = source === 'AUTO';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isAuto ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>
      {isAuto ? 'Auto' : 'Manual'}
    </span>
  );
}

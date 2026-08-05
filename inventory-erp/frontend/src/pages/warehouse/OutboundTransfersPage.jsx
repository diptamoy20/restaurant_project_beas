import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/TextField';
import { SelectField } from '../../components/ui/SelectField';
import { RestaurantCell } from '../../components/ui/RestaurantCell';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

export function OutboundTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newRestaurantId, setNewRestaurantId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState([{ ingredientId: '', quantity: '' }]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [transRes, whRes, ingRes, restRes] = await Promise.all([
        apiFetch('warehouse/outbound-transfers'),
        apiFetch('warehouse'),
        apiFetch('master/ingredients'),
        apiFetch('integration/restaurants').catch(() => []),
      ]);
      setTransfers(Array.isArray(transRes) ? transRes : []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);
      setRestaurants(Array.isArray(restRes) ? restRes : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load outbound transfers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id) => {
    if (!confirm('Approve this outbound transfer?')) return;
    setProcessingId(id);
    try {
      await apiFetch(`warehouse/outbound-transfers/${id}/approve`, { method: 'POST' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDispatch = async (id) => {
    if (!confirm('Dispatch this transfer? This will deduct warehouse stock and increase restaurant store inventory.')) return;
    setProcessingId(id);
    try {
      await apiFetch(`warehouse/outbound-transfers/${id}/dispatch`, { method: 'POST' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Dispatch failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newWarehouseId || !newRestaurantId || newItems.every(i => !i.ingredientId)) {
      alert('Please select a warehouse, a restaurant, and add at least one item.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('warehouse/outbound-transfers', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: Number(newWarehouseId),
          restaurantId: Number(newRestaurantId),
          notes: newNotes || null,
          items: newItems.filter(i => i.ingredientId && i.quantity).map(i => ({
            ingredientId: Number(i.ingredientId),
            quantity: Number(i.quantity),
          })),
        }),
      });
      setShowCreateModal(false);
      resetCreateForm();
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create outbound transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewWarehouseId('');
    setNewRestaurantId('');
    setNewNotes('');
    setNewItems([{ ingredientId: '', quantity: '' }]);
  };

  const addCreateItem = () => setNewItems([...newItems, { ingredientId: '', quantity: '' }]);
  const removeCreateItem = (index) => setNewItems(newItems.filter((_, i) => i !== index));
  const updateCreateItem = (index, field, value) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  if (loading && transfers.length === 0) return <Loader label="Loading outbound transfers..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Transfer #', key: 'transferNumber', render: (row) => <span className="font-medium text-slate-900">{row.transferNumber}</span> },
    { header: 'Warehouse', key: 'warehouse', render: (row) => row.warehouse?.name || '—' },
    {
      header: 'Restaurant',
      key: 'restaurant',
      render: (row) => <RestaurantCell name={row.restaurantName} id={row.restaurantId} />,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-800'}`}>
          {row.status}
        </span>
      ),
    },
    { header: 'Requested By', key: 'requestedBy', render: (row) => row.requestedBy?.name || '—' },
    { header: 'Dispatched By', key: 'dispatchedBy', render: (row) => row.approvedBy?.name || '—' },
    {
      header: 'Items',
      key: 'items',
      render: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          {(row.items || []).map((item, i) => (
            <div key={i}>{item.ingredient?.name || `#${item.ingredientId}`}: {item.quantity} {item.ingredient?.unit}</div>
          ))}
        </div>
      ),
    },
    { header: 'Date', key: 'createdAt', render: (row) => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span> },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => {
        if (processingId === row.id) return <span className="text-xs text-slate-400">Processing...</span>;
        if (row.status === 'PENDING') {
          return (
            <Button variant="primary" className="px-2.5 py-1 text-xs" onClick={() => handleApprove(row.id)}>
              Approve
            </Button>
          );
        }
        if (row.status === 'APPROVED') {
          return (
            <Button variant="primary" className="px-2.5 py-1 text-xs" onClick={() => handleDispatch(row.id)}>
              Dispatch
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outbound Transfers</h1>
          <p className="text-sm text-slate-500">Stock dispatched from warehouse to restaurant stores</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>New Outbound Transfer</Button>
      </div>

      <Card title="Outbound Transfers" eyebrow="Warehouse to Restaurants">
        <Table columns={columns} data={transfers} emptyMessage="No outbound transfers recorded yet." />
      </Card>

      <Modal
        open={showCreateModal}
        title="New Outbound Transfer"
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Transfer'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <SelectField
            label="Source Warehouse"
            options={[{ value: '', label: 'Select warehouse...' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]}
            value={newWarehouseId}
            onChange={(e) => setNewWarehouseId(e.target.value)}
          />
          <SelectField
            label="Restaurant"
            options={[{ value: '', label: 'Select restaurant...' }, ...restaurants.map(r => ({ value: r.id, label: r.name }))]}
            value={newRestaurantId}
            onChange={(e) => setNewRestaurantId(e.target.value)}
          />
          <TextField
            label="Notes (optional)"
            placeholder="Transfer notes..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Items</p>
            {newItems.map((item, index) => (
              <div key={index} className="flex items-end gap-3">
                <SelectField
                  label={index === 0 ? 'Ingredient' : undefined}
                  className="flex-1"
                  options={[{ value: '', label: 'Select ingredient...' }, ...ingredients.map(ing => ({ value: ing.id, label: ing.name }))]}
                  value={item.ingredientId}
                  onChange={(e) => updateCreateItem(index, 'ingredientId', e.target.value)}
                />
                <TextField
                  label={index === 0 ? 'Qty' : undefined}
                  className="w-24"
                  type="number"
                  min="0"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateCreateItem(index, 'quantity', e.target.value)}
                />
                {newItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCreateItem(index)}
                    className="mb-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCreateItem}
              className="text-sm font-semibold text-slate-900 hover:text-slate-700"
            >
              + Add item
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

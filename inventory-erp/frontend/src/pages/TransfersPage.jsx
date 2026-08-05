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

export function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restaurantId = useSelector((state) => state.restaurant.restaurantId);
  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.role || 'STORE_MANAGER';

  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState([{ ingredientId: '', quantity: 1 }]);
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, ingRes] = await Promise.all([
        apiFetch(`stock-movement/transfers?restaurantId=${restaurantId}`),
        apiFetch('master/ingredients'),
      ]);
      setTransfers(transRes);
      setIngredients(ingRes);
      if (ingRes.length > 0) {
        setTransferItems([{ ingredientId: ingRes[0].id, quantity: 1 }]);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load transfers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleItemChange = (idx, field, val) => {
    const updated = [...transferItems];
    updated[idx][field] = val;
    setTransferItems(updated);
  };

  const addItemRow = () => {
    const defaultIngId = ingredients[0]?.id || '';
    setTransferItems([...transferItems, { ingredientId: defaultIngId, quantity: 1 }]);
  };

  const removeItemRow = (idx) => {
    if (transferItems.length === 1) return;
    setTransferItems(transferItems.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const itemsPayload = transferItems.map((item) => ({
        ingredientId: Number(item.ingredientId),
        quantity: Number(item.quantity),
      }));

      await apiFetch('stock-movement/transfers', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: Number(restaurantId),
          notes: notes || null,
          items: itemsPayload,
        }),
      });

      setModalOpen(false);
      setNotes('');
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create transfer request.');
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiFetch(`stock-movement/transfers/${id}/approve`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Approval failed.');
    }
  };

  if (loading && transfers.length === 0) return <Loader label="Loading kitchen transfers..." />;
  if (error) return <ErrorState error={error} />;

  const canApprove = ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'STORE_MANAGER'].includes(userRole);

  const columns = [
    { header: 'Transfer #', key: 'transferNumber' },
    { header: 'Status', key: 'status', render: (row) => {
      const colors = {
        PENDING: 'bg-amber-100 text-amber-800',
        APPROVED: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-emerald-100 text-emerald-800',
        REJECTED: 'bg-rose-100 text-rose-800',
      };
      return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[row.status]}`}>
          {row.status}
        </span>
      );
    }},
    { header: 'Requested By', key: 'requestedBy', render: (row) => row.requestedBy?.name },
    { header: 'Approved By', key: 'approvedBy', render: (row) => row.approvedBy?.name || '—' },
    { header: 'Notes', key: 'notes', render: (row) => row.notes || '—' },
    { header: 'Created', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { header: 'Actions', key: 'actions', render: (row) => (
      row.status === 'PENDING' && canApprove ? (
        <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => handleApprove(row.id)}>
          Approve & Issue
        </Button>
      ) : null
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kitchen Transfers</h1>
          <p className="text-sm text-slate-500">Transfer ingredients from Store Room to Kitchen stations.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>New Transfer Request</Button>
      </div>

      <Card title="Transfer History" eyebrow="Store to Kitchen">
        <Table columns={columns} data={transfers} emptyMessage="No transfer requests found." />
      </Card>

      <Modal open={modalOpen} title="Request Kitchen Transfer" onClose={() => setModalOpen(false)} maxWidth="max-w-3xl">
        <form onSubmit={handleCreateTransfer} className="space-y-6">
          <TextField label="Transfer Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Morning kitchen refill" />

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-900">Items to Transfer</h4>
              <Button variant="secondary" className="py-1 px-3 text-xs" onClick={addItemRow}>+ Add Item</Button>
            </div>
            {transferItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <SelectField
                  label="Ingredient"
                  value={item.ingredientId}
                  onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                  options={ingredients.map((ing) => ({ label: `${ing.name} (${ing.sku})`, value: ing.id }))}
                  required
                />
                <TextField
                  label="Quantity"
                  type="number"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  required
                />
                <Button variant="danger" className="py-2.5 px-3 mb-0.5" onClick={() => removeItemRow(idx)} disabled={transferItems.length === 1}>
                  X
                </Button>
              </div>
            ))}
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Transfer Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

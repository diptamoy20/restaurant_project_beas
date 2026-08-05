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

export function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restaurantId = useSelector((state) => state.restaurant.restaurantId);
  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.role || 'STORE_MANAGER';

  const [modalOpen, setModalOpen] = useState(false);
  const [fromType, setFromType] = useState('KITCHEN');
  const [toType, setToType] = useState('STORE');
  const [ingredientId, setIngredientId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [retRes, ingRes, whRes] = await Promise.all([
        apiFetch(`reporting/returns?restaurantId=${restaurantId}`),
        apiFetch('master/ingredients'),
        apiFetch('warehouse'),
      ]);
      setReturns(retRes);
      setIngredients(ingRes);
      setWarehouses(whRes);
      if (ingRes.length > 0) setIngredientId(ingRes[0].id);
      if (whRes.length > 0) setWarehouseId(whRes[0].id);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load returns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const handleFromTypeChange = (val) => {
    setFromType(val);
    if (val === 'KITCHEN') {
      setToType('STORE');
    } else {
      setToType('WAREHOUSE');
    }
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await apiFetch('reporting/returns', {
        method: 'POST',
        body: JSON.stringify({
          fromType,
          toType,
          restaurantId: Number(restaurantId),
          warehouseId: toType === 'WAREHOUSE' ? Number(warehouseId) : null,
          ingredientId: Number(ingredientId),
          quantity: Number(quantity),
          reason,
        }),
      });
      setModalOpen(false);
      setReason('');
      setQuantity(1);
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create return.');
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiFetch(`reporting/returns/${id}/approve`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Approval failed.');
    }
  };

  if (loading && returns.length === 0) return <Loader label="Loading material returns..." />;
  if (error) return <ErrorState error={error} />;

  const canApprove = ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER', 'STORE_MANAGER'].includes(userRole);

  const columns = [
    { header: 'Return #', key: 'returnNumber' },
    { header: 'From', key: 'fromType', render: (row) => (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{row.fromType}</span>
    )},
    { header: 'To', key: 'toType', render: (row) => (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">{row.toType}</span>
    )},
    { header: 'Ingredient', key: 'ingredient', render: (row) => row.ingredient?.name || 'N/A' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Reason', key: 'reason' },
    { header: 'Status', key: 'isApproved', render: (row) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {row.isApproved ? 'Approved' : 'Pending'}
      </span>
    )},
    { header: 'Date', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleDateString() },
    { header: 'Actions', key: 'actions', render: (row) => (
      !row.isApproved && canApprove ? (
        <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => handleApprove(row.id)}>
          Approve
        </Button>
      ) : null
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Material Returns</h1>
          <p className="text-sm text-slate-500">Track ingredient returns between Kitchen, Store, and Warehouse locations.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Log Material Return</Button>
      </div>

      <Card title="Return History" eyebrow="Material Movement">
        <Table columns={columns} data={returns} emptyMessage="No material return records found." />
      </Card>

      <Modal open={modalOpen} title="Log Material Return" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreateReturn} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Return From"
              value={fromType}
              onChange={(e) => handleFromTypeChange(e.target.value)}
              options={[
                { label: 'Kitchen', value: 'KITCHEN' },
                { label: 'Store Room', value: 'STORE' },
              ]}
              required
            />
            <SelectField
              label="Return To"
              value={toType}
              onChange={(e) => setToType(e.target.value)}
              options={
                fromType === 'KITCHEN'
                  ? [{ label: 'Store Room', value: 'STORE' }]
                  : [{ label: 'Warehouse', value: 'WAREHOUSE' }]
              }
              required
            />
          </div>

          <SelectField
            label="Ingredient"
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            options={ingredients.map((i) => ({ label: `${i.name} (${i.sku})`, value: i.id }))}
            required
          />

          {toType === 'WAREHOUSE' && (
            <SelectField
              label="Target Warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <TextField label="Quantity" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Excess stock" required />
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Return</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

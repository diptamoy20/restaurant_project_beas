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

export function WarehouseStockPage() {
  const [stock, setStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustIngredientId, setAdjustIngredientId] = useState('');
  const [adjustNewQty, setAdjustNewQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [whRes, stockRes] = await Promise.all([
        apiFetch('warehouse'),
        apiFetch(`warehouse/inventory${selectedWarehouse ? `?warehouseId=${selectedWarehouse}` : ''}`),
      ]);
      setWarehouses(whRes);
      setStock(stockRes);
      if (!selectedWarehouse && whRes.length > 0) {
        setSelectedWarehouse(String(whRes[0].id));
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load warehouse stock.');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    setAdjustError('');
    setAdjusting(true);
    try {
      await apiFetch('warehouse/adjust', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: Number(selectedWarehouse),
          ingredientId: Number(adjustIngredientId),
          newQuantity: Number(adjustNewQty),
          reason: adjustReason,
        }),
      });
      setAdjustModalOpen(false);
      setAdjustIngredientId('');
      setAdjustNewQty('');
      setAdjustReason('');
      fetchData();
    } catch (err) {
      setAdjustError(err.message || 'Adjustment failed.');
    } finally {
      setAdjusting(false);
    }
  };

  const openAdjustModal = () => {
    if (stock.length > 0) {
      setAdjustIngredientId(String(stock[0].ingredientId));
    }
    setAdjustNewQty('');
    setAdjustReason('');
    setAdjustError('');
    setAdjustModalOpen(true);
  };

  if (loading && stock.length === 0) return <Loader label="Loading warehouse stock levels..." />;
  if (error) return <ErrorState error={error} />;

  const selectedWhName = warehouses.find((w) => String(w.id) === String(selectedWarehouse))?.name || 'All';

  const columns = [
    {
      header: 'Ingredient',
      key: 'ingredient',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.ingredient?.name || 'N/A'}</span>
      ),
    },
    { header: 'SKU', key: 'sku', render: (row) => <span className="text-slate-500">{row.ingredient?.sku || '—'}</span> },
    { header: 'Unit', key: 'unit', render: (row) => row.ingredient?.unit || '—' },
    {
      header: 'Available Qty',
      key: 'availableQuantity',
      render: (row) => (
        <span className={`font-semibold ${row.availableQuantity <= 0 ? 'text-rose-600' : row.availableQuantity <= 10 ? 'text-amber-600' : 'text-slate-900'}`}>
          {row.availableQuantity}
        </span>
      ),
    },
    { header: 'Warehouse Name', key: 'warehouse', render: (row) => row.warehouse?.name || 'N/A' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Inventory</h1>
          <p className="text-sm text-slate-500">Central warehouse stock levels. GRN receipts increase these balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <SelectField
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            options={warehouses.map((w) => ({ label: w.name, value: String(w.id) }))}
          />
          <Button onClick={openAdjustModal} disabled={!selectedWarehouse || stock.length === 0}>
            Adjust Stock
          </Button>
        </div>
      </div>

      <Card
        title="Warehouse Stock Balances"
        eyebrow={`Warehouse: ${selectedWhName}`}
      >
        <Table
          columns={columns}
          data={stock}
          emptyMessage="No warehouse stock records. Receive goods via GRN first."
        />
      </Card>

      <Modal open={adjustModalOpen} title="Manual Stock Adjustment" onClose={() => setAdjustModalOpen(false)}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <SelectField
            label="Select Ingredient"
            value={adjustIngredientId}
            onChange={(e) => setAdjustIngredientId(e.target.value)}
            options={stock.map((s) => ({
              label: `${s.ingredient?.name} (Current: ${s.availableQuantity} ${s.ingredient?.unit || ''})`,
              value: String(s.ingredientId),
            }))}
            required
          />
          <TextField
            label="New Quantity"
            type="number"
            step="any"
            min="0"
            value={adjustNewQty}
            onChange={(e) => setAdjustNewQty(e.target.value)}
            required
          />
          <TextField
            label="Reason for Adjustment"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. Cycle count correction, Damaged goods write-off"
            required
          />
          {adjustError ? <ErrorState error={adjustError} /> : null}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setAdjustModalOpen(false)} disabled={adjusting}>
              Cancel
            </Button>
            <Button type="submit" disabled={adjusting}>
              {adjusting ? 'Applying...' : 'Apply Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

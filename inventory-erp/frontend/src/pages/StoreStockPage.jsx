import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Table } from '../components/ui/Table';
import { SelectField } from '../components/ui/SelectField';
import { useSelector } from 'react-redux';

export function StoreStockPage() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restaurantId = useSelector((state) => state.restaurant.restaurantId);

  const fetchData = async () => {
    if (!restaurantId) {
      setStock([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`stock-movement/store/stock?restaurantId=${restaurantId}`);
      setStock(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load store inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  if (loading && stock.length === 0) return <Loader label="Loading dry store room inventory..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Ingredient', key: 'ingredient', render: (row) => row.ingredient?.name || 'N/A' },
    { header: 'SKU', key: 'sku', render: (row) => row.ingredient?.sku },
    { header: 'Unit', key: 'unit', render: (row) => row.ingredient?.unit },
    { header: 'Available Qty', key: 'availableQuantity', render: (row) => (
      <span className={`font-semibold ${row.availableQuantity <= 0 ? 'text-rose-600' : row.status === 'LOW_STOCK' ? 'text-amber-600' : 'text-slate-900'}`}>
        {row.availableQuantity}
      </span>
    )},
    { header: 'Reserved Qty', key: 'reservedQuantity', render: (row) => row.reservedQuantity || 0 },
    { header: 'Status', key: 'status', render: (row) => {
      const colors = {
        HEALTHY: 'bg-emerald-100 text-emerald-800',
        LOW_STOCK: 'bg-amber-100 text-amber-800',
        OUT_OF_STOCK: 'bg-rose-100 text-rose-800',
      };
      return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[row.status] || colors.HEALTHY}`}>
          {(row.status || 'HEALTHY').replace('_', ' ')}
        </span>
      );
    }},
    { header: 'Min Stock', key: 'minimumStock', render: (row) => row.minimumStock ?? row.ingredient?.minimumStock ?? '—' },
    { header: 'Max Stock', key: 'maximumStock', render: (row) => row.maximumStock ?? row.ingredient?.maximumStock ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Room Inventory</h1>
          <p className="text-sm text-slate-500">Restaurant dry store room stock levels. Replenished via requisitions from the central warehouse.</p>
        </div>
      </div>

      <Card title="Store Stock Balances" eyebrow={restaurantId ? `Restaurant ID: ${restaurantId}` : 'Select a restaurant workspace'}>
        <Table columns={columns} data={stock} emptyMessage="No store inventory records. Create a requisition to replenish from warehouse." />
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

export function KitchenStockPage() {
  const { slug } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`operations/${slug}/kitchen-inventory`);
      setItems(Array.isArray(res) ? res : res.items || []);
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

  if (loading) return <Loader label="Loading kitchen inventory..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  const columns = [
    { key: 'ingredient', header: 'Ingredient', render: (row) => (
      <span className="font-semibold text-slate-900">{row.ingredient?.name || row.ingredient}</span>
    )},
    { key: 'sku', header: 'SKU', render: (row) => row.ingredient?.sku || '—' },
    { key: 'unit', header: 'Unit', render: (row) => row.ingredient?.unit || '—' },
    { key: 'availableQuantity', header: 'Available Qty', render: (row) => {
      const qty = row.availableQuantity ?? 0;
      const min = row.minimumStock ?? 0;
      const color = qty <= 0 ? 'text-rose-600' : qty <= min ? 'text-amber-600' : 'text-emerald-600';
      return <span className={`font-semibold ${color}`}>{qty}</span>;
    }},
    { key: 'status', header: 'Status', render: (row) => (
      <StatusBadge status={row.status} qty={row.availableQuantity ?? 0} min={row.minimumStock ?? 0} />
    )},
    { key: 'minimumStock', header: 'Min Stock', render: (row) => row.minimumStock ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
        <h1 className="text-2xl font-bold text-slate-900">Kitchen Inventory</h1>
        <p className="text-sm text-slate-500">Chef station operational stock</p>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState message="No kitchen items found." />
        ) : (
          <Table columns={columns} data={items} emptyMessage="No kitchen items found." />
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status, qty, min }) {
  const effectiveStatus = status || (qty <= 0 ? 'OUT_OF_STOCK' : qty <= min ? 'LOW_STOCK' : 'HEALTHY');

  const styles = {
    HEALTHY: 'bg-emerald-100 text-emerald-800',
    LOW_STOCK: 'bg-amber-100 text-amber-800',
    OUT_OF_STOCK: 'bg-rose-100 text-rose-800',
    IN_STOCK: 'bg-emerald-100 text-emerald-800',
  };

  const labels = {
    HEALTHY: 'Healthy',
    LOW_STOCK: 'Low Stock',
    OUT_OF_STOCK: 'Out of Stock',
    IN_STOCK: 'In Stock',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[effectiveStatus] || 'bg-slate-100 text-slate-800'}`}>
      {labels[effectiveStatus] || effectiveStatus}
    </span>
  );
}

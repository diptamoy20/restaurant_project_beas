import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

export function ReportsPage() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`operations/${slug}/reports`);
      setReport(res);
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

  if (loading) return <Loader label="Loading reports..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  const kpis = report?.kpis || {};
  const storeStock = report?.storeStock || [];
  const kitchenStock = report?.kitchenStock || [];

  const storeColumns = [
    { key: 'ingredient', header: 'Ingredient', render: (row) => (
      <span className="font-semibold text-slate-900">{row.ingredient}</span>
    )},
    { key: 'sku', header: 'SKU' },
    { key: 'unit', header: 'Unit' },
    { key: 'quantity', header: 'Quantity', render: (row) => (
      <span className="font-semibold text-slate-900">{row.quantity ?? row.availableQty ?? 0}</span>
    )},
    { key: 'minStock', header: 'Min Stock' },
  ];

  const kitchenColumns = [
    { key: 'ingredient', header: 'Ingredient', render: (row) => (
      <span className="font-semibold text-slate-900">{row.ingredient}</span>
    )},
    { key: 'sku', header: 'SKU' },
    { key: 'unit', header: 'Unit' },
    { key: 'quantity', header: 'Quantity', render: (row) => (
      <span className="font-semibold text-slate-900">{row.quantity ?? row.availableQty ?? 0}</span>
    )},
    { key: 'minStock', header: 'Min Stock' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{slug}</p>
        <h1 className="text-2xl font-bold text-slate-900">Restaurant Reports</h1>
        <p className="text-sm text-slate-500">Inventory analytics for this branch</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Store Items" eyebrow="Store Inventory">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.storeItems ?? storeStock.length ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Items</span>
          </div>
        </Card>

        <Card title="Kitchen Items" eyebrow="Kitchen Inventory">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.kitchenItems ?? kitchenStock.length ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Items</span>
          </div>
        </Card>

        <Card title="Total Waste Entries" eyebrow="Waste Management">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.totalWasteEntries ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Entries</span>
          </div>
        </Card>

        <Card title="Total Waste Qty" eyebrow="Waste Management">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{kpis.totalWasteQty ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Units</span>
          </div>
        </Card>
      </div>

      <Card title="Store Stock Overview" eyebrow="Store Room">
        {storeStock.length === 0 ? (
          <EmptyState message="No store stock data available." />
        ) : (
          <Table columns={storeColumns} data={storeStock} emptyMessage="No store stock data." />
        )}
      </Card>

      <Card title="Kitchen Stock Overview" eyebrow="Kitchen">
        {kitchenStock.length === 0 ? (
          <EmptyState message="No kitchen stock data available." />
        ) : (
          <Table columns={kitchenColumns} data={kitchenStock} emptyMessage="No kitchen stock data." />
        )}
      </Card>
    </div>
  );
}

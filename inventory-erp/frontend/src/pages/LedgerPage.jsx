import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Table } from '../components/ui/Table';
import { SelectField } from '../components/ui/SelectField';

export function LedgerPage() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [locationFilter, setLocationFilter] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [ingredients, setIngredients] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (locationFilter) params.append('locationType', locationFilter);
      if (ingredientFilter) params.append('ingredientId', ingredientFilter);

      const queryStr = params.toString();
      const [ledgerRes, ingRes] = await Promise.all([
        apiFetch(`reporting/ledger${queryStr ? `?${queryStr}` : ''}`),
        apiFetch('master/ingredients'),
      ]);
      setLedger(Array.isArray(ledgerRes) ? ledgerRes : ledgerRes.items || []);
      setIngredients(ingRes);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load stock ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [locationFilter, ingredientFilter]);

  if (loading && ledger.length === 0) return <Loader label="Loading stock ledger..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Date', key: 'timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
    { header: 'Ingredient', key: 'ingredient', render: (row) => row.ingredient?.name || 'N/A' },
    { header: 'Location', key: 'locationType', render: (row) => (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{row.locationType}</span>
    )},
    { header: 'Type', key: 'refType', render: (row) => (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
        {row.refType?.replace('_', ' ')}
      </span>
    )},
    { header: 'Reference', key: 'referenceId' },
    { header: 'Qty Change', key: 'quantity', render: (row) => (
      <span className={`font-semibold ${row.quantity > 0 ? 'text-emerald-600' : row.quantity < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
        {row.quantity > 0 ? '+' : ''}{row.quantity}
      </span>
    )},
    { header: 'Before', key: 'beforeQuantity' },
    { header: 'After', key: 'afterQuantity' },
    { header: 'Unit', key: 'unit' },
    { header: 'User', key: 'user', render: (row) => row.user?.name || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Ledger</h1>
          <p className="text-sm text-slate-500">Immutable double-entry log of all stock movements across warehouse, store, and kitchen.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <SelectField
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          options={[
            { label: 'All Locations', value: '' },
            { label: 'Warehouse', value: 'WAREHOUSE' },
            { label: 'Store', value: 'STORE' },
            { label: 'Kitchen', value: 'KITCHEN' },
          ]}
        />
        <SelectField
          value={ingredientFilter}
          onChange={(e) => setIngredientFilter(e.target.value)}
          options={[
            { label: 'All Ingredients', value: '' },
            ...ingredients.map((i) => ({ label: `${i.name} (${i.sku})`, value: i.id })),
          ]}
        />
      </div>

      <Card title="Stock Movement Ledger" eyebrow="Audit Trail">
        <Table columns={columns} data={ledger} emptyMessage="No ledger entries found." />
      </Card>
    </div>
  );
}

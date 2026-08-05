import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { RestaurantCell } from '../../components/ui/RestaurantCell';

export function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('reporting/returns');
      setReturns(Array.isArray(res) ? res : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load material returns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await apiFetch(`reporting/returns/${id}/approve`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Approval failed.');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading && returns.length === 0) return <Loader label="Loading material returns..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Return #', key: 'returnNumber', render: (row) => <span className="font-medium text-slate-900">{row.returnNumber}</span> },
    {
      header: 'Restaurant',
      key: 'restaurant',
      render: (row) => <RestaurantCell name={row.restaurantName} id={row.restaurantId} />,
    },
    {
      header: 'From',
      key: 'fromType',
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          {row.fromType}
        </span>
      ),
    },
    {
      header: 'To',
      key: 'toType',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {row.toType}
          </span>
          {row.toType === 'WAREHOUSE' && row.warehouse?.name && (
            <span className="text-xs text-slate-500">{row.warehouse.name}</span>
          )}
        </div>
      ),
    },
    { header: 'Ingredient', key: 'ingredient', render: (row) => row.ingredient?.name || 'N/A' },
    { header: 'Quantity', key: 'quantity', render: (row) => <span className="font-medium text-slate-900">{row.quantity}</span> },
    { header: 'Reason', key: 'reason', render: (row) => <span className="text-slate-600">{row.reason || '—'}</span> },
    {
      header: 'Status',
      key: 'isApproved',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {row.isApproved ? 'Approved' : 'Pending'}
        </span>
      ),
    },
    { header: 'Date', key: 'createdAt', render: (row) => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span> },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        !row.isApproved ? (
          <Button
            variant="secondary"
            className="px-2.5 py-1 text-xs"
            onClick={() => handleApprove(row.id)}
            disabled={approvingId === row.id}
          >
            {approvingId === row.id ? 'Approving...' : 'Approve'}
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Material Returns</h1>
        <p className="text-sm text-slate-500">Track ingredient returns between Kitchen, Store, and Warehouse locations</p>
      </div>

      <Card title="Return History" eyebrow="Material Movement">
        <Table columns={columns} data={returns} emptyMessage="No material return records found." />
      </Card>
    </div>
  );
}

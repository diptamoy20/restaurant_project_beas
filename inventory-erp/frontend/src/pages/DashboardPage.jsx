import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('reporting/dashboard');
      setStats(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await apiFetch('reporting/seed-demo', { method: 'POST' });
      await fetchStats();
      alert('Demo data (Basmati Rice, Chicken, Biryani Recipes, Stock levels) seeded successfully!');
    } catch (err) {
      alert(err.message || 'Seeding failed.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !stats) return <Loader label="Loading dashboard metrics..." />;
  if (error) return <ErrorState error={error} />;

  const kpis = stats?.kpis || {};
  const recentActivities = stats?.recentActivities || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Central Inventory Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time status overview of procurement and warehouse levels.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStats} variant="secondary">
            Refresh
          </Button>
          <Button onClick={handleSeedDemo} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Warehouse Items" eyebrow="Procurement Catalog">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.totalWarehouseItems ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600">Active Materials</span>
          </div>
        </Card>

        <Card title="Dry Store Items" eyebrow="Restaurant Stores">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.totalStoreItems ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600">On-site Stocks</span>
          </div>
        </Card>

        <Card title="Pending Transfers" eyebrow="Stock Movements">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.pendingTransfersCount ?? 0}</span>
            <span className="text-xs font-semibold text-amber-600">Needs Approval</span>
          </div>
        </Card>

        <Card title="Low Stock Alerts" eyebrow="Replenishment Warnings">
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${kpis.lowStockAlertsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.lowStockAlertsCount ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Below Thresholds</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent Ledger Entries */}
        <Card title="Recent Stock Ledger Timeline" eyebrow="Double-entry log">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No recent movements logged. Click "Seed Demo Data" above to initialize sample data.</p>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivities.map((activity, idx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {idx !== recentActivities.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-xs font-bold ${
                            activity.qty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {activity.qty > 0 ? '+' : '-'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-slate-700 font-semibold">
                              {activity.ingredient} ({activity.qty} {activity.unit})
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Type: <span className="font-semibold text-slate-600">{activity.refType.replace('_', ' ')}</span> | Ref: {activity.refId} | Loc: {activity.location}
                            </p>
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-slate-500">
                            <p className="font-semibold text-slate-700">{activity.user}</p>
                            <p>{new Date(activity.time).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Informational Guidelines Card */}
        <Card title="Enterprise Workflows" eyebrow="ERP System Info">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="border-l-4 border-emerald-500 pl-3">
              <h4 className="font-semibold text-slate-800">Master Catalog Rule</h4>
              <p className="text-xs text-slate-500 mt-1">
                Ingredients master catalog is shared. Suppliers are mapped to ingredients with custom negotiated prices.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-3">
              <h4 className="font-semibold text-slate-800">Decoupled Order Deduction</h4>
              <p className="text-xs text-slate-500 mt-1">
                Customer orders are prepared inside the POS/Restaurant application. The ERP consumes recipe BOM weights from the operational Kitchen stock automatically via API.
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-slate-800">Procurement Cycle</h4>
              <p className="text-xs text-slate-500 mt-1">
                  Create a Purchase Order -&gt; Approve PO -&gt; Receive goods using Goods Receipt Notes -&gt; Warehouse Inventory increases automatically.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

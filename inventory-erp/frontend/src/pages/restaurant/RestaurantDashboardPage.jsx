import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';

function StatusDot({ status }) {
  const color =
    status === 'HEALTHY' || status === 'Healthy' ? 'bg-emerald-500' :
    status === 'OUT_OF_STOCK' || status === 'Out of Stock' ? 'bg-rose-500' :
    status === 'LOW_STOCK' || status === 'Low Stock' ? 'bg-amber-500' :
    'bg-slate-300';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function RestaurantDashboardPage() {
  const { slug } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`operations/${slug}/dashboard`);
      setStats(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [slug]);

  if (loading) return <Loader label="Loading restaurant dashboard..." />;
  if (error) return <ErrorState error={error} retry={fetchStats} />;

  const kpis = stats?.kpis || {};
  const restaurant = stats?.restaurant || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Branch inventory overview for {restaurant.name || slug}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Store Items" eyebrow="Store Inventory">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.storeItems ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </Card>

        <Card title="Kitchen Items" eyebrow="Kitchen Inventory">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.kitchenItems ?? 0}</span>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </Card>

        <Card title="Pending Transfers" eyebrow="Store → Kitchen">
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${kpis.pendingTransfers > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {kpis.pendingTransfers ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Needs Approval</span>
          </div>
        </Card>

        <Card title="Store Requests" eyebrow="To Warehouse">
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${kpis.pendingStoreRequests > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.pendingStoreRequests ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Pending</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Store Low Stock" eyebrow="Requires Attention">
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${kpis.storeLowStock > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.storeLowStock ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Items</span>
          </div>
        </Card>

        <Card title="Kitchen Low Stock" eyebrow="Requires Attention">
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${kpis.kitchenLowStock > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.kitchenLowStock ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Items</span>
          </div>
        </Card>

        <Card title="Waste Logs" eyebrow="This Period">
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{kpis.totalWasteLogs ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Entries</span>
          </div>
        </Card>
      </div>

      {/* Low Stock Preview */}
      {stats?.lowStockPreview && (
        (stats.lowStockPreview.store?.length > 0 || stats.lowStockPreview.kitchen?.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {stats.lowStockPreview.store?.length > 0 && (
              <Card title="Store Low Stock Items" eyebrow="Below Minimum">
                <div className="space-y-2">
                  {stats.lowStockPreview.store.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <StatusDot status={item.status} />
                        <span className="text-sm font-semibold text-slate-900">{item.ingredient}</span>
                      </div>
                      <span className="text-sm font-bold text-rose-600">
                        {item.available} / {item.minimum} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {stats.lowStockPreview.kitchen?.length > 0 && (
              <Card title="Kitchen Low Stock Items" eyebrow="Below Minimum">
                <div className="space-y-2">
                  {stats.lowStockPreview.kitchen.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <StatusDot status={item.status} />
                        <span className="text-sm font-semibold text-slate-900">{item.ingredient}</span>
                      </div>
                      <span className="text-sm font-bold text-rose-600">
                        {item.available} / {item.minimum} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )
      )}

      {/* Recent Store Requests */}
      {stats?.recentStoreRequests?.length > 0 && (
        <Card title="Recent Store Requests" eyebrow="To Warehouse">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Request #</th>
                  <th className="px-4 py-2.5">Requested By</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentStoreRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{req.requestNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{req.requestedBy}</td>
                    <td className="px-4 py-2.5 text-slate-600">{req.itemCount} items</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Transfers */}
      {stats?.recentTransfers?.length > 0 && (
        <Card title="Recent Kitchen Transfers" eyebrow="Store → Kitchen">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Transfer #</th>
                  <th className="px-4 py-2.5">Requested By</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransfers.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{t.transferNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.requestedBy}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.itemCount} items</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'COMPLETED' ? 'bg-slate-100 text-slate-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Consumption */}
      {stats?.recentConsumption?.length > 0 && (
        <Card title="Recent Kitchen Consumption" eyebrow="Recipe Usage">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentConsumption.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{c.ingredient}</td>
                    <td className="px-4 py-2.5 font-semibold text-rose-600">-{c.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.unit}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(c.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Waste */}
      {stats?.recentWaste?.length > 0 && (
        <Card title="Recent Waste Logs" eyebrow="Waste Management">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentWaste.map((w) => (
                  <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{w.ingredient}</td>
                    <td className="px-4 py-2.5 font-semibold text-rose-600">{w.quantity}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {w.wasteType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

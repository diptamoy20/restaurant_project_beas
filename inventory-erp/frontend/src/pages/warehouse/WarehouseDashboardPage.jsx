import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';

function KpiCard({ title, eyebrow, value, accent, sub }) {
  const valueColor =
    accent === 'amber' ? 'text-amber-600' :
    accent === 'rose' ? 'text-rose-600' :
    accent === 'emerald' ? 'text-emerald-600' :
    'text-slate-900';
  return (
    <Card title={title} eyebrow={eyebrow}>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${valueColor}`}>{value ?? 0}</span>
        {sub ? <span className="text-xs font-semibold text-slate-500">{sub}</span> : null}
      </div>
    </Card>
  );
}

export function WarehouseDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('warehouse/dashboard');
        setStats(res);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loader label="Loading warehouse dashboard..." />;
  if (error) return <ErrorState error={error} />;

  const kpis = stats?.kpis || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Central warehouse operations overview</p>
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Pending Purchase Orders"
          eyebrow="Procurement"
          value={kpis.pendingPurchaseOrders}
          accent={kpis.pendingPurchaseOrders > 0 ? 'amber' : undefined}
          sub="Awaiting Approval"
        />
        <KpiCard
          title="Approved POs"
          eyebrow="Supplier Deliveries"
          value={kpis.approvedPurchaseOrders}
          accent="emerald"
          sub="Awaiting Delivery"
        />
        <KpiCard
          title="Pending Store Requests"
          eyebrow="From Restaurants"
          value={kpis.pendingStoreRequestsCount}
          accent={kpis.pendingStoreRequestsCount > 0 ? 'rose' : undefined}
          sub="Need Fulfillment"
        />
        <KpiCard
          title="Pending Dispatches"
          eyebrow="Outbound Transfers"
          value={kpis.pendingDispatches}
          accent={kpis.pendingDispatches > 0 ? 'amber' : undefined}
          sub="To Restaurants"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Items"
          eyebrow="Warehouse Stock"
          value={kpis.totalItems}
          sub="Active Materials"
        />
        <KpiCard
          title="Total Stock"
          eyebrow="Units Available"
          value={kpis.totalStock}
          sub="Total Units"
        />
        <KpiCard
          title="Low Stock Alerts"
          eyebrow="Requires Attention"
          value={kpis.lowStockAlerts}
          accent={kpis.lowStockAlerts > 0 ? 'rose' : undefined}
          sub="Below Threshold"
        />
        <KpiCard
          title="Goods Receipts"
          eyebrow="Total GRNs"
          value={kpis.pendingGrns}
          sub="Recorded"
        />
      </div>

      {/* Low Stock Items */}
      {stats?.lowStockItems?.length > 0 && (
        <Card title="Low Stock Alerts" eyebrow="Requires Attention">
          <div className="space-y-2">
            {stats.lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.ingredient}</p>
                  <p className="text-xs text-slate-500">{item.sku}</p>
                </div>
                <span className="text-sm font-bold text-rose-600">
                  {item.availableQuantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending Store Requests */}
      {stats?.recentStoreRequests?.length > 0 && (
        <Card title="Recent Store Requests" eyebrow="From Restaurants">
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
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
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

      {/* Recent Goods Receipts */}
      {stats?.recentGrns?.length > 0 && (
        <Card title="Recent Goods Receipts" eyebrow="Last 5 GRNs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">GRN #</th>
                  <th className="px-4 py-2.5">PO #</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentGrns.map((grn) => (
                  <tr key={grn.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{grn.grnNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{grn.poNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600">{grn.supplier}</td>
                    <td className="px-4 py-2.5 text-slate-600">{grn.itemCount} items</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(grn.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Stock Ledger */}
      {stats?.recentLedger?.length > 0 && (
        <Card title="Recent Stock Movements" eyebrow="Stock Ledger">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5">Movement</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Before</th>
                  <th className="px-4 py-2.5">After</th>
                  <th className="px-4 py-2.5">Type</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLedger.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{entry.ingredient}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${entry.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{Math.abs(entry.quantity)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{entry.beforeQuantity}</td>
                    <td className="px-4 py-2.5 text-slate-500">{entry.afterQuantity}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {entry.refType}
                      </span>
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

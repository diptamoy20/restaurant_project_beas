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

export function WarehouseReportsPage() {
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
        setError(err.message || 'Failed to load warehouse reports.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loader label="Loading warehouse reports..." />;
  if (error) return <ErrorState error={error} />;

  const kpis = stats?.kpis || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Reports</h1>
        <p className="text-sm text-slate-500">Analytics and reporting for warehouse operations</p>
      </div>

      {/* KPI Cards */}
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
          title="Pending GRNs"
          eyebrow="Goods Receipts"
          value={kpis.pendingGrns}
          accent={kpis.pendingGrns > 0 ? 'amber' : undefined}
          sub="Awaiting Processing"
        />
      </div>

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
          value={kpis.pendingStoreRequests}
          accent={kpis.pendingStoreRequests > 0 ? 'rose' : undefined}
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

      {/* Low Stock Items */}
      {stats?.lowStockItems?.length > 0 && (
        <Card title="Low Stock Items" eyebrow="Requires Attention">
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Ingredient</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">SKU</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Available Qty</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {stats.lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.ingredient}</td>
                      <td className="px-4 py-3 text-slate-500">{item.sku}</td>
                      <td className="px-4 py-3 font-semibold text-rose-600">{item.availableQuantity}</td>
                      <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Recent GRNs */}
      {stats?.recentGrns?.length > 0 && (
        <Card title="Recent GRNs" eyebrow="Last 5 Receipts">
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">GRN #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">PO #</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Items</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {stats.recentGrns.map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{grn.grnNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{grn.poNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{grn.supplier}</td>
                      <td className="px-4 py-3 text-slate-600">{grn.itemCount} items</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(grn.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

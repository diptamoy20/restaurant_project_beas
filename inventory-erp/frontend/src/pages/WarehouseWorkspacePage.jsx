import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { apiFetch } from '../utils/api';
import { setWarehouse } from '../app/store';
import { Loader } from '../components/ui/Loader';
import { Button } from '../components/ui/Button';

function KpiTile({ label, value, accent }) {
  const color =
    accent === 'amber' ? 'text-amber-600' :
    accent === 'rose' ? 'text-rose-600' :
    accent === 'emerald' ? 'text-emerald-600' :
    'text-slate-900';
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function WarehouseWorkspacePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('warehouse/overview');
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleOpenWarehouse = () => {
    if (overview?.warehouse?.id) {
      dispatch(setWarehouse({
        warehouseId: overview.warehouse.id,
        warehouseName: overview.warehouse.name,
      }));
    }
    navigate('/warehouse/dashboard');
  };

  if (loading) return <Loader label="Loading warehouse overview..." />;

  if (error && !overview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse</h1>
          <p className="text-sm text-slate-500">Central Warehouse Operations</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm font-semibold text-rose-800 mb-1">Unable to load warehouse overview</p>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <Button onClick={fetchOverview}>Retry</Button>
        </div>
      </div>
    );
  }

  const kpis = overview?.kpis || {};
  const wh = overview?.warehouse || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse</h1>
        <p className="text-sm text-slate-500">
          Manage the organization's central inventory, procurement, receiving and distribution.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <span className="text-2xl">🏭</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{wh.name || 'Main Warehouse'}</h2>
              <p className="text-xs text-slate-500">{wh.location || 'Central Operations'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">Healthy</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <KpiTile label="Pending Purchase Orders" value={kpis.pendingPurchaseOrders ?? 0} accent="amber" />
          <KpiTile label="Pending Supplier Deliveries" value={kpis.pendingDeliveries ?? 0} accent="amber" />
          <KpiTile label="Pending Store Requests" value={kpis.pendingStoreRequests ?? 0} accent="amber" />
          <KpiTile label="Pending Dispatches" value={kpis.pendingDispatches ?? 0} accent="amber" />
          <KpiTile label="Low Stock Alerts" value={kpis.lowStockAlerts ?? 0} accent={kpis.lowStockAlerts > 0 ? 'rose' : undefined} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <KpiTile label="Total Inventory Items" value={kpis.totalItems ?? 0} />
          <KpiTile label="Total Stock Units" value={kpis.totalStock ?? 0} />
          <KpiTile label="Total Inventory Value" value={kpis.totalInventoryValue ?? 0} />
        </div>

        <button
          onClick={handleOpenWarehouse}
          className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 transition"
        >
          Open Warehouse →
        </button>
      </div>
    </div>
  );
}

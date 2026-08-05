import { useGetInventoryDashboardQuery, useSeedInventoryDataMutation } from '../../services/inventoryApi';
import { InventorySubNav } from './InventorySubNav';

export function InventoryDashboardPage() {
  const { data: dashboard, isLoading, error, refetch } = useGetInventoryDashboardQuery();
  const [seedInventory, { isLoading: isSeeding }] = useSeedInventoryDataMutation();

  const handleSeedData = async () => {
    try {
      await seedInventory().unwrap();
      refetch();
    } catch (err) {
      console.error('Failed to seed inventory:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <InventorySubNav />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <InventorySubNav />
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">
          Failed to load inventory dashboard metrics. Please check network connection.
        </div>
      </div>
    );
  }

  const metrics = dashboard || {
    storeInventoryValue: 0,
    kitchenInventoryValue: 0,
    totalInventoryItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingRequisitions: 0,
    pendingKitchenTransfers: 0,
    todayIngredientConsumption: 0,
    todayWaste: 0,
    recentActivities: [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory ERP Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking of Store Room, Kitchen Stock, Recipe Consumption, and Replenishment
          </p>
        </div>
        {metrics.totalInventoryItems === 0 && (
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50"
          >
            {isSeeding ? 'Seeding Demo Data...' : '⚡ Seed Initial Inventory & Recipes'}
          </button>
        )}
      </div>

      <InventorySubNav />

      {/* Warning Banners for Low / Out of Stock */}
      {(metrics.lowStockItems > 0 || metrics.outOfStockItems > 0) && (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-600 dark:text-amber-400">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm">Stock Attention Needed</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You have {metrics.lowStockItems} low stock items and {metrics.outOfStockItems} out-of-stock items requiring stock transfer or requisition.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Store Inventory Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">₹{metrics.storeInventoryValue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Internal Storage Room</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kitchen Inventory Value</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{metrics.kitchenInventoryValue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Chef Prep Operational Stock</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Ingredients</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalInventoryItems}</p>
          <p className="mt-1 text-xs text-slate-500">Active catalog items</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low / Out Stock</p>
          <p className="mt-2 text-2xl font-bold text-rose-500">
            {metrics.lowStockItems} <span className="text-xs font-normal text-slate-400">Low</span> / {metrics.outOfStockItems} <span className="text-xs font-normal text-slate-400">Out</span>
          </p>
          <p className="mt-1 text-xs text-rose-400">Requires Transfer/Requisition</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Transfers</p>
          <p className="mt-2 text-2xl font-bold text-indigo-500">{metrics.pendingKitchenTransfers}</p>
          <p className="mt-1 text-xs text-slate-500">Store → Kitchen requests</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Requisitions</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{metrics.pendingRequisitions}</p>
          <p className="mt-1 text-xs text-slate-500">Store → Warehouse requests</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Consumption</p>
          <p className="mt-2 text-2xl font-bold text-sky-500">{metrics.todayIngredientConsumption} <span className="text-xs font-normal text-slate-400">units</span></p>
          <p className="mt-1 text-xs text-slate-500">Auto-deducted via recipes</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Waste</p>
          <p className="mt-2 text-2xl font-bold text-slate-400">{metrics.todayWaste} <span className="text-xs font-normal">units</span></p>
          <p className="mt-1 text-xs text-slate-500">Spoilage & wastage</p>
        </div>
      </div>

      {/* Recent Activity Feed Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Inventory Activities</h2>
        {metrics.recentActivities.length === 0 ? (
          <p className="text-sm text-slate-500">No inventory transactions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Inventory Type</th>
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{new Date(act.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{act.item}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          act.inventoryType === 'STORE'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {act.inventoryType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">{act.transactionType}</td>
                    <td className={`py-3 px-4 text-right font-bold ${act.quantity < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {act.quantity > 0 ? `+${act.quantity}` : act.quantity} {act.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

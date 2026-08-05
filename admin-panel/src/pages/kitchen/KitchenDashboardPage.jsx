import { useSelector } from 'react-redux';
import { useGetInventoryDashboardQuery } from '../../services/kitchenApi';
import { KitchenSubNav } from './KitchenSubNav';

export function KitchenDashboardPage() {
  const { restaurantId } = useSelector((state) => state.kitchen);
  const { data: dashboard, isLoading, error } = useGetInventoryDashboardQuery(restaurantId, { skip: !restaurantId });

  if (!restaurantId) {
    return (
      <div className="p-6">
        <KitchenSubNav />
        <div className="rounded-2xl bg-amber-500/10 p-4 text-amber-600">
          Loading restaurant context...
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <KitchenSubNav />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <KitchenSubNav />
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">
          Failed to load kitchen dashboard metrics.
        </div>
      </div>
    );
  }

  const metrics = dashboard || {
    ordersPreparing: 0,
    ordersReady: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingKitchenTransfers: 0,
    todayIngredientConsumption: 0,
    recentActivities: [],
  };

  return (
    <div className="space-y-6">
      <KitchenSubNav />

      {(metrics.lowStockItems > 0 || metrics.outOfStockItems > 0) && (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-600 dark:text-amber-400">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-2xl">!</span>
            <div>
              <p className="font-semibold text-sm">Kitchen Stock Attention Needed</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {metrics.lowStockItems} low stock items and {metrics.outOfStockItems} out-of-stock items.
                Request ingredients from the store to replenish.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Orders Preparing</p>
          <p className="mt-2 text-2xl font-bold text-indigo-500">{metrics.ordersPreparing || 0}</p>
          <p className="mt-1 text-xs text-slate-500">Currently being prepared</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Orders Ready</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.ordersReady || 0}</p>
          <p className="mt-1 text-xs text-slate-500">Ready to serve</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low / Out of Stock</p>
          <p className="mt-2 text-2xl font-bold text-rose-500">
            {metrics.lowStockItems} <span className="text-xs font-normal text-slate-400">Low</span> / {metrics.outOfStockItems} <span className="text-xs font-normal text-slate-400">Out</span>
          </p>
          <p className="mt-1 text-xs text-rose-400">Requires Kitchen Request</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Requests</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{metrics.pendingKitchenTransfers}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting store approval</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:col-span-2 lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Ingredient Consumption</p>
          <p className="mt-2 text-2xl font-bold text-sky-500">{metrics.todayIngredientConsumption} <span className="text-xs font-normal text-slate-400">units</span></p>
          <p className="mt-1 text-xs text-slate-500">Auto-deducted from kitchen stock via recipes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Kitchen Activity</h2>
        {metrics.recentActivities?.length === 0 ? (
          <p className="text-sm text-slate-500">No kitchen transactions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.recentActivities?.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{new Date(act.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{act.item}</td>
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

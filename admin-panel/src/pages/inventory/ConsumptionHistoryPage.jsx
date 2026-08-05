import React from 'react';
import { useGetConsumptionHistoryQuery } from '../../services/inventoryApi';
import { InventorySubNav } from './InventorySubNav';

export function ConsumptionHistoryPage() {
  const { data: history, isLoading, error } = useGetConsumptionHistoryQuery();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen Consumption History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Permanent audit log of ingredient deductions triggered automatically by order status updates.
        </p>
      </div>

      <InventorySubNav />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load consumption history.</div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-slate-500">
          No ingredient consumption logged yet. Dedutions occur automatically when orders are set to PREPARING.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-4">Ingredient Consumed</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Before → After Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">#{log.orderId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        <p>{log.menuItemName}</p>
                        <p className="text-xs font-normal text-slate-400">{log.recipeName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{log.ingredientName}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-500">
                      -{log.quantityConsumed} {log.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-xs">
                      {log.beforeQuantity} → {log.afterQuantity} {log.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

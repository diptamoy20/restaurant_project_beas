import React from 'react';
import { InventorySubNav } from './InventorySubNav';

export function InventoryReportsPage() {
  const reportsList = [
    { title: 'Current Stock movement', description: 'Log audit showing item-wise adjustments over custom periods.', icon: '📈' },
    { title: 'Inventory Valuation', description: 'Real-time asset valuation of Store Room and Kitchen ingredients.', icon: '💰' },
    { title: 'Food Cost Report', description: 'Compare ingredient consumption costs against menu item sales.', icon: '🍽️' },
    { title: 'Waste Report', description: 'Declared raw spoilage and discarded food items tracking.', icon: '🗑️' },
    { title: 'Fast / Slow Moving Items', description: 'Analyze ingredient velocity to optimize reordering thresholds.', icon: '⚡' },
    { title: 'Requisition Analytics', description: 'Store-to-Warehouse fulfillment delay and quantity metrics.', icon: '📦' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analytics dashboard for stock movements, waste tracking, food cost, and replenishment efficiency.
        </p>
      </div>

      <InventorySubNav />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportsList.map((rep, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="space-y-2">
              <div className="text-2xl">{rep.icon}</div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{rep.title}</h3>
              <p className="text-xs text-slate-500">{rep.description}</p>
            </div>
            <button className="w-full text-center text-xs font-semibold text-amber-500 hover:text-amber-600 border-t border-slate-50 dark:border-slate-800/40 pt-3">
              Generate Report →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

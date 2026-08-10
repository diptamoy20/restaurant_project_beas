import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetKitchenInventoryQuery, useGetTransactionLedgerQuery } from '../../services/kitchenApi';
import { KitchenSubNav } from './KitchenSubNav';

export function KitchenInventoryPage() {
  const { restaurantId } = useSelector((state) => state.kitchen);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: kitchenInventory = [], isLoading, error } = useGetKitchenInventoryQuery(
    { restaurantId, search, status },
    { skip: !restaurantId }
  );

  const { data: transactions } = useGetTransactionLedgerQuery(
    selectedItem ? { restaurantId, itemId: selectedItem.itemId, inventoryType: 'KITCHEN' } : undefined,
    { skip: !selectedItem || !restaurantId }
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'LOW_STOCK':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'OUT_OF_STOCK':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <KitchenSubNav />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen Inventory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Read-only view of current kitchen stock. Consumed automatically when orders enter PREPARING status.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search kitchen ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="HEALTHY">Healthy</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load Kitchen Inventory.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Min Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {kitchenInventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No kitchen inventory data found.
                    </td>
                  </tr>
                ) : (
                  kitchenInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{item.category}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {item.availableQuantity} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">
                        {item.minimumStock} {item.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Ledger Log
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kitchen Ledger: {selectedItem.name}</h3>
                <p className="text-xs text-slate-500">Kitchen stock movements and recipe deductions</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900"
              >
                X
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {transactions?.filter((t) => t.itemId === selectedItem.itemId).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No kitchen transactions recorded for this item.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2">Timestamp</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Ref / Order</th>
                      <th className="py-2 text-right">Adjustment</th>
                      <th className="py-2 text-right">Before - After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {transactions
                      ?.filter((t) => t.itemId === selectedItem.itemId)
                      .map((t) => (
                        <tr key={t.id} className="py-2">
                          <td className="py-2 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="py-2 font-mono">{t.transactionType}</td>
                          <td className="py-2 text-slate-400">{t.referenceId || '-'}</td>
                          <td className={`py-2 text-right font-bold ${t.quantity < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {t.quantity > 0 ? `+${t.quantity}` : t.quantity} {t.unit}
                          </td>
                          <td className="py-2 text-right text-slate-500">
                            {t.beforeQuantity} - {t.afterQuantity} {t.unit}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

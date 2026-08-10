import React, { useState } from 'react';
import {
  useGetStoreInventoryQuery,
  useCreateInventoryItemMutation,
  useGetTransactionLedgerQuery,
} from '../../services/inventoryApi';
import { InventorySubNav } from './InventorySubNav';

export function StoreInventoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Item form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [unit, setUnit] = useState('KG');
  const [costPrice, setCostPrice] = useState(0);
  const [initialStoreStock, setInitialStoreStock] = useState(0);
  const [storeMinStock, setStoreMinStock] = useState(10);
  const [storeMaxStock, setStoreMaxStock] = useState(200);
  const [storeReorderLevel, setStoreReorderLevel] = useState(15);
  const [initialKitchenStock, setInitialKitchenStock] = useState(0);
  const [kitchenMinStock, setKitchenMinStock] = useState(5);

  const { data: storeInventory, isLoading, error, refetch } = useGetStoreInventoryQuery({
    search,
    category,
    status,
  });

  const { data: transactions } = useGetTransactionLedgerQuery(
    selectedItem ? { itemId: selectedItem.itemId, inventoryType: 'STORE' } : undefined,
    { skip: !selectedItem }
  );

  const [createItem, { isLoading: isCreating }] = useCreateInventoryItemMutation();

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await createItem({
        name,
        sku,
        category: formCategory,
        unit,
        costPrice: Number(costPrice),
        initialStoreStock: Number(initialStoreStock),
        storeMinStock: Number(storeMinStock),
        storeMaxStock: Number(storeMaxStock),
        storeReorderLevel: Number(storeReorderLevel),
        initialKitchenStock: Number(initialKitchenStock),
        kitchenMinStock: Number(kitchenMinStock),
      }).unwrap();
      setIsCreateOpen(false);
      refetch();
      // Reset form
      setName('');
      setSku('');
      setFormCategory('');
      setCostPrice(0);
      setInitialStoreStock(0);
      setInitialKitchenStock(0);
    } catch (err) {
      console.error('Failed to create inventory item:', err);
    }
  };

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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Store Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Restaurant's Internal Storage Room Stock. Receives from Warehouse, supplies Kitchen.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition"
        >
          ➕ Add New Ingredient
        </button>
      </div>

      <InventorySubNav />

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by ingredient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        >
          <option value="">All Categories</option>
          <option value="Grains">Grains</option>
          <option value="Poultry">Poultry</option>
          <option value="Produce">Produce</option>
          <option value="Dairy">Dairy</option>
          <option value="Oils & Fats">Oils & Fats</option>
          <option value="Spices & Condiments">Spices & Condiments</option>
        </select>

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

      {/* Inventory Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load Store Inventory.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Reserved Qty</th>
                  <th className="py-3 px-4 text-right">Min / Max Stock</th>
                  <th className="py-3 px-4 text-right">Reorder Lvl</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {storeInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        <p>{item.name}</p>
                        <p className="text-xs font-normal text-slate-400">{item.sku || 'No SKU'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{item.category}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.availableQuantity} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {item.reservedQuantity} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                      {item.minimumStock} / {item.maximumStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 text-xs">
                      {item.reorderLevel} {item.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Store Ledger: {selectedItem.name}</h3>
                <p className="text-xs text-slate-500">Stock changes audit ledger</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {transactions?.filter((t) => t.itemId === selectedItem.itemId).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No transactions recorded for this item.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2">Timestamp</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Adjustment</th>
                      <th className="py-2 text-right">Before → After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {transactions
                      ?.filter((t) => t.itemId === selectedItem.itemId)
                      .map((t) => (
                        <tr key={t.id} className="py-2">
                          <td className="py-2 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="py-2 font-mono">{t.transactionType}</td>
                          <td className={`py-2 text-right font-bold ${t.quantity < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {t.quantity > 0 ? `+${t.quantity}` : t.quantity} {t.unit}
                          </td>
                          <td className="py-2 text-right text-slate-500">
                            {t.beforeQuantity} → {t.afterQuantity} {t.unit}
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

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Ingredient & Init Stock</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Ingredient Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Basmati Rice"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">SKU / Item Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. RICE-01"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Category</label>
                  <select
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">Select Category</option>
                    <option value="Grains">Grains</option>
                    <option value="Poultry">Poultry</option>
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Oils & Fats">Oils & Fats</option>
                    <option value="Spices & Condiments">Spices & Condiments</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Inventory Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="KG">Kilogram (KG)</option>
                    <option value="GM">Gram (GM)</option>
                    <option value="L">Liter (L)</option>
                    <option value="ML">Milliliter (ML)</option>
                    <option value="PCS">Pieces (PCS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Initial Store Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={initialStoreStock}
                    onChange={(e) => setInitialStoreStock(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Initial Kitchen Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={initialKitchenStock}
                    onChange={(e) => setInitialKitchenStock(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Safety Threshold Limits</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-500">Store Min Stock</label>
                    <input
                      type="number"
                      value={storeMinStock}
                      onChange={(e) => setStoreMinStock(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-500">Store Max Stock</label>
                    <input
                      type="number"
                      value={storeMaxStock}
                      onChange={(e) => setStoreMaxStock(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-500">Store Reorder Level</label>
                    <input
                      type="number"
                      value={storeReorderLevel}
                      onChange={(e) => setStoreReorderLevel(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-500">Kitchen Min Stock</label>
                    <input
                      type="number"
                      value={kitchenMinStock}
                      onChange={(e) => setKitchenMinStock(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50"
                >
                  {isCreating ? 'Adding...' : 'Add Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

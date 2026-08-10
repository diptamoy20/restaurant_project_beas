import React, { useState } from 'react';
import {
  useGetKitchenTransfersQuery,
  useGetStoreInventoryQuery,
  useCreateKitchenTransferMutation,
  useApproveKitchenTransferMutation,
} from '../../services/inventoryApi';
import { InventorySubNav } from './InventorySubNav';

export function KitchenTransfersPage() {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([{ itemId: '', quantity: 1 }]);

  const { data: transfers, isLoading, error, refetch } = useGetKitchenTransfersQuery();
  const { data: storeInventory } = useGetStoreInventoryQuery();

  const [createTransfer, { isLoading: isCreating }] = useCreateKitchenTransferMutation();
  const [approveTransfer] = useApproveKitchenTransferMutation();

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { itemId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const handleCreateTransferSubmit = async (e) => {
    e.preventDefault();
    const payloadItems = selectedItems
      .filter((i) => i.itemId)
      .map((i) => ({
        itemId: Number(i.itemId),
        quantity: Number(i.quantity),
      }));

    if (payloadItems.length === 0) return;

    try {
      await createTransfer({
        notes,
        items: payloadItems,
      }).unwrap();
      setIsTransferOpen(false);
      setNotes('');
      setSelectedItems([{ itemId: '', quantity: 1 }]);
      refetch();
    } catch (err) {
      console.error('Failed to create kitchen transfer request:', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveTransfer(id).unwrap();
      refetch();
    } catch (err) {
      console.error('Failed to approve kitchen transfer:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen Stock Transfers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Issue raw ingredients from Store Room to Kitchen. Reduces Store, increases Kitchen.
          </p>
        </div>
        <button
          onClick={() => setIsTransferOpen(true)}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition"
        >
          📝 Request Kitchen Transfer
        </button>
      </div>

      <InventorySubNav />

      {/* Transfer requests history */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load transfer history.</div>
      ) : (
        <div className="space-y-4">
          {transfers.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Transfer Request: {t.transferNumber}</h3>
                  <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      t.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {t.status}
                  </span>
                  {t.status === 'PENDING' && (
                    <button
                      onClick={() => handleApprove(t.id)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/10"
                    >
                      Approve & Issue
                    </button>
                  )}
                </div>
              </div>

              {t.notes && <p className="text-xs italic text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">"{t.notes}"</p>}

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 font-semibold uppercase">
                      <th className="py-1">Ingredient Item</th>
                      <th className="py-1 text-right">Transfer Quantity</th>
                      <th className="py-1 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.items.map((ti) => (
                      <tr key={ti.id} className="border-b border-slate-50 dark:border-slate-800/20 last:border-b-0">
                        <td className="py-2 text-slate-900 dark:text-white font-medium">{ti.item.name}</td>
                        <td className="py-2 text-right font-bold">{ti.quantity}</td>
                        <td className="py-2 text-right text-slate-500">{ti.item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Transfer Request Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Store to Kitchen Transfer</h3>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500">Transfer Request Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning prep stock replenish"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-xs font-bold text-slate-400 uppercase">Transfer Items List</p>
                {selectedItems.map((row, idx) => {
                  const currentStoreItem = storeInventory?.find((s) => s.itemId === Number(row.itemId));
                  return (
                    <div key={idx} className="flex gap-3 items-center">
                      <select
                        required
                        value={row.itemId}
                        onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                      >
                        <option value="">Select Ingredient</option>
                        {storeInventory?.map((item) => (
                          <option key={item.id} value={item.itemId}>
                            {item.name} (Avail: {item.availableQuantity} {item.unit})
                          </option>
                        ))}
                      </select>

                      <div className="w-28 flex items-center gap-1.5">
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                        />
                        <span className="text-xs text-slate-500 font-semibold">{currentStoreItem?.unit || ''}</span>
                      </div>

                      {selectedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 text-sm hover:underline font-bold px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-amber-500 hover:text-amber-600"
              >
                + Add Another Ingredient
              </button>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50"
                >
                  {isCreating ? 'Creating Request...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

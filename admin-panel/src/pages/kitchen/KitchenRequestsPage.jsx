import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetKitchenTransfersQuery, useCreateKitchenTransferMutation } from '../../services/kitchenApi';
import { useGetStoreInventoryQuery } from '../../services/inventoryApi';
import { KitchenSubNav } from './KitchenSubNav';

export function KitchenRequestsPage() {
  const { restaurantId } = useSelector((state) => state.kitchen);

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
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requestNotes, setRequestNotes] = useState('');
  const [requestItems, setRequestItems] = useState([{ itemId: '', itemName: '', quantity: 1 }]);

  const { data: transfers = [], isLoading, error, refetch } = useGetKitchenTransfersQuery(restaurantId, { skip: !restaurantId });
  const { data: storeInventory = [] } = useGetStoreInventoryQuery({ restaurantId }, { skip: !restaurantId });
  const [createTransfer, { isLoading: isCreating }] = useCreateKitchenTransferMutation();

  const filteredTransfers = filterStatus
    ? transfers.filter((t) => t.status === filterStatus)
    : transfers;

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'TRANSFERRED':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const addItem = () => setRequestItems([...requestItems, { itemId: '', itemName: '', quantity: 1 }]);
  const removeItem = (index) => setRequestItems(requestItems.filter((_, i) => i !== index));

  const handleItemSelect = (index, itemId) => {
    const item = storeInventory.find((i) => String(i.itemId) === String(itemId));
    const updated = [...requestItems];
    updated[index] = {
      itemId: Number(itemId),
      itemName: item?.name || '',
      quantity: updated[index].quantity,
    };
    setRequestItems(updated);
  };

  const updateQuantity = (index, value) => {
    const updated = [...requestItems];
    updated[index] = { ...updated[index], quantity: Number(value) };
    setRequestItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const validItems = requestItems.filter((i) => i.itemId && i.quantity > 0);
      if (validItems.length === 0) return;
      await createTransfer({
        restaurantId,
        notes: requestNotes,
        items: validItems.map((i) => ({ itemId: i.itemId, quantity: Number(i.quantity) })),
      }).unwrap();
      setShowCreateModal(false);
      setRequestNotes('');
      setRequestItems([{ itemId: '', itemName: '', quantity: 1 }]);
      refetch();
    } catch (err) {
      console.error('Failed to create kitchen request:', err);
    }
  };

  const itemLabel = (item) => {
    if (item.ingredient?.name) return item.ingredient.name;
    if (item.itemName) return item.itemName;
    return `Item #${item.itemId}`;
  };

  return (
    <div className="space-y-6">
      <KitchenSubNav />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Request ingredients from the Store Inventory. Approval and fulfillment handled by the Inventory ERP.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600"
        >
          + New Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              filterStatus === s
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load kitchen requests.</div>
      ) : filteredTransfers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
          No kitchen requests found. Click "New Request" to request ingredients from the store.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          {t.requestNumber || t.transferNumber}
                        </span>
                        {t.requestSource && (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            t.requestSource === 'AUTO'
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {t.requestSource === 'AUTO' ? 'Auto' : 'Manual'}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {t.items?.map((item, i) => (
                        <span key={i} className="inline-block mr-1 mb-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                          {itemLabel(item)} x{item.quantity}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{t.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">New Kitchen Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900">X</button>
            </div>

            <div className="space-y-3">
              {requestItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={item.itemId}
                    onChange={(e) => handleItemSelect(index, e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">Select store item...</option>
                    {storeInventory.map((si) => (
                      <option key={si.itemId} value={si.itemId}>
                        {si.name} ({si.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(index, e.target.value)}
                    className="w-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                  {requestItems.length > 1 && (
                    <button onClick={() => removeItem(index)} className="text-rose-500 text-xs font-semibold">Remove</button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="text-xs font-semibold text-amber-500 hover:text-amber-600">+ Add Item</button>
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isCreating}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isCreating ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

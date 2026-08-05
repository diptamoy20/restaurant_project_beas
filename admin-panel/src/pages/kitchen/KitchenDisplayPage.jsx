import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetKitchenDisplayOrdersQuery } from '../../services/kitchenApi';
import { KitchenSubNav } from './KitchenSubNav';

export function KitchenDisplayPage() {
  const { restaurantId } = useSelector((state) => state.kitchen);
  const { data: orders = [], isLoading, error } = useGetKitchenDisplayOrdersQuery(restaurantId, {
    skip: !restaurantId,
    pollingInterval: 15000,
  });

  const getElapsed = (startedAt) => {
    const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
    return `${mins}m`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kitchen Display System</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Active orders currently being prepared. Inventory is auto-deducted when orders enter PREPARING status.
          </p>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-600">
          {orders.length} Active Orders
        </div>
      </div>

      <KitchenSubNav />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load kitchen display orders.</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <p className="text-4xl mb-4">All Clear</p>
          <p className="text-slate-500">No orders currently being prepared.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between bg-amber-500 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">{order.orderNumber}</p>
                  <p className="text-xs text-amber-100">{order.table || order.orderType}</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">{order.status}</span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wide">{order.orderType}</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono">{new Date(order.orderTime).toLocaleTimeString()}</span>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600">
                      {getElapsed(order.startedAt)} elapsed
                    </span>
                  </span>
                </div>
                {order.customerName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customer: {order.customerName}</p>
                )}
                {order.items?.map((item, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{getElapsed(item.startedAt)}</span>
                    </div>
                    {item.instructions && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Note: {item.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

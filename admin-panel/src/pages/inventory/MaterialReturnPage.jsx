import React from 'react';
import { InventorySubNav } from './InventorySubNav';

export function MaterialReturnPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Material Return</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kitchen to Store to Warehouse Reverse Logistics Flow.
        </p>
      </div>

      <InventorySubNav />

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl">
          🔄
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reverse Stock Return Flow</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This module is reserved for reverse logistics (e.g. returning unused dry goods or damaged stock from the kitchen back to store, or returning store room over-purchases back to the central warehouse).
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-left">
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">1. Kitchen Return</p>
            <p className="text-slate-500">Chefs declare unused ingredients to return to Store room.</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">2. Store Return</p>
            <p className="text-slate-500">Store room registers return & updates local store balance.</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">3. Central ERP</p>
            <p className="text-slate-500">Store requests central return of bulk items back to warehouse.</p>
          </div>
        </div>

        <button className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition">
          View Return Guidelines
        </button>
      </div>
    </div>
  );
}

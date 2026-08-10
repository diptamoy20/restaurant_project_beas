import React from 'react';

export function EmptyState({ message = 'No records found.' }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

import React from 'react';

export function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}

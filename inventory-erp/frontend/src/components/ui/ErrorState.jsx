import React from 'react';

export function ErrorState({ error }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-600">
      {error?.message || error || 'Something went wrong. Please try again.'}
    </div>
  );
}

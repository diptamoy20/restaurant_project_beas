import React from 'react';

export function RestaurantCell({ name, id }) {
  return (
    <span className="font-medium text-slate-900">
      {name || `#${id}`}
    </span>
  );
}

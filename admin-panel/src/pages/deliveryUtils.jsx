export const deliveryStatusOptions = [
  { value: '', label: 'All delivery orders' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'ON_THE_WAY', label: 'On the way' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export const deliveryStatusClasses = {
  ASSIGNED: 'bg-amber-100 text-amber-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-900',
  ON_THE_WAY: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-emerald-100 text-emerald-900',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

export function formatCurrency(value) {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}

export function formatLabel(value) {
  return String(value || '-')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function DeliveryStatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        deliveryStatusClasses[status] ?? 'bg-slate-200 text-slate-700'
      }`}
    >
      {formatLabel(status)}
    </span>
  );
}

export function getNextDeliveryAction(deliveryStatus) {
  if (deliveryStatus === 'ASSIGNED') {
    return { label: 'Accept', action: 'accept' };
  }

  if (deliveryStatus === 'OUT_FOR_DELIVERY') {
    return { label: 'Mark On The Way', action: 'status', status: 'ON_THE_WAY' };
  }

  if (deliveryStatus === 'ON_THE_WAY') {
    return { label: 'Mark Delivered', action: 'status', status: 'DELIVERED' };
  }

  return null;
}

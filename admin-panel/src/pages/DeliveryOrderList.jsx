import { Button } from '../components/ui/Button';
import {
  DeliveryStatusBadge,
  formatCurrency,
  formatLabel,
  getNextDeliveryAction,
} from './deliveryUtils.jsx';

export function DeliveryOrderList({
  actionLoading = false,
  emptyMessage = 'No delivery orders found.',
  onOpenOrder,
  onRunAction,
  orders,
  showActions = false,
}) {
  if (!orders.length) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {orders.map((order, index) => {
        const nextAction = getNextDeliveryAction(order.deliveryStatus);

        return (
          <article
            className={`p-4 ${index > 0 ? 'border-t border-slate-100' : ''}`}
            key={order.deliveryId ?? order.orderId}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-slate-950">
                    {order.orderNumber}
                  </span>
                  <DeliveryStatusBadge status={order.deliveryStatus} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatLabel(order.orderStatus)}
                  </span>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-[minmax(160px,0.8fr)_minmax(0,1.4fr)_minmax(150px,0.7fr)]">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
                    <p className="truncate font-medium text-slate-950">
                      {order.customerName || 'Customer'}
                    </p>
                    <p className="text-slate-500">{order.customerPhone || '-'}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-400">Address</p>
                    <p className="line-clamp-2 text-slate-700">{order.addressText || '-'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Items</p>
                    <p className="font-medium text-slate-950">
                      {order.itemCount} items / {order.totalQuantity} qty
                    </p>
                    <p className="text-slate-500">
                      {formatLabel(order.paymentMethod)} / {formatLabel(order.paymentStatus)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 xl:min-w-56 xl:flex-col xl:items-end xl:justify-center">
                <p className="text-lg font-semibold text-slate-950">
                  {formatCurrency(order.finalAmount)}
                </p>

                {showActions ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => onOpenOrder?.(order.orderId)} variant="secondary">
                      View
                    </Button>
                    {nextAction ? (
                      <Button disabled={actionLoading} onClick={() => onRunAction?.(order)}>
                        {nextAction.label}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

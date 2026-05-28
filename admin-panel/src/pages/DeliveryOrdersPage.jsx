import { useMemo, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { SelectField } from '../components/ui/SelectField';
import {
  useAcceptMyDeliveryOrderMutation,
  useGetMyDeliveryOrderQuery,
  useListMyDeliveryOrdersQuery,
  useUpdateMyDeliveryOrderStatusMutation,
} from '../services/deliveryApi';
import { DeliveryOrderList } from './DeliveryOrderList';
import {
  DeliveryStatusBadge,
  deliveryStatusOptions,
  formatCurrency,
  formatDateTime,
  formatLabel,
  getNextDeliveryAction,
} from './deliveryUtils.jsx';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  );
}

function DeliveryOrderDetailsModal({ orderId, onClose }) {
  const { data, isFetching, error } = useGetMyDeliveryOrderQuery(orderId, {
    skip: !orderId,
    pollingInterval: 15000,
  });
  const [acceptOrder, acceptState] = useAcceptMyDeliveryOrderMutation();
  const [updateStatus, updateStatusState] = useUpdateMyDeliveryOrderStatusMutation();
  const nextAction = getNextDeliveryAction(data?.delivery?.status);
  const actionLoading = acceptState.isLoading || updateStatusState.isLoading;
  const actionError = acceptState.error || updateStatusState.error;

  if (!orderId) {
    return null;
  }

  const runNextAction = async () => {
    if (!nextAction || !data?.order?.id) {
      return;
    }

    if (nextAction.action === 'accept') {
      await acceptOrder(data.order.id).unwrap();
      return;
    }

    await updateStatus({ orderId: data.order.id, status: nextAction.status }).unwrap();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Assigned Order
            </p>
            <h3 className="text-xl font-semibold text-slate-950">
              {data?.order?.orderNumber ?? 'Order details'}
            </h3>
          </div>
          <button
            aria-label="Close order details"
            className="grid h-9 w-9 place-items-center rounded-full text-xl text-slate-700 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {isFetching ? <Loader label="Loading order details..." /> : null}
        {error ? (
          <ErrorState
            message={error?.data?.message || error?.error || 'Unable to load order details.'}
          />
        ) : null}
        {actionError ? (
          <div className="mb-4">
            <ErrorState
              message={
                actionError?.data?.message ||
                actionError?.error ||
                'Unable to update this delivery.'
              }
            />
          </div>
        ) : null}

        {data ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h4 className="mb-4 font-semibold text-slate-950">Customer</h4>
                <div className="grid gap-3 text-sm">
                  <DetailRow label="Name" value={data.customer?.name || '-'} />
                  <DetailRow label="Phone" value={data.customer?.phone || '-'} />
                  <DetailRow label="Address" value={data.customer?.address?.fullText || '-'} />
                  <DetailRow label="Created" value={formatDateTime(data.order?.createdAt)} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h4 className="mb-4 font-semibold text-slate-950">Delivery</h4>
                <div className="grid gap-3 text-sm">
                  <DetailRow label="Restaurant" value={data.restaurant?.name || '-'} />
                  <DetailRow label="Restaurant address" value={data.restaurant?.address || '-'} />
                  <DetailRow
                    label="Status"
                    value={<DeliveryStatusBadge status={data.delivery?.status} />}
                  />
                  <DetailRow
                    label="Distance"
                    value={
                      data.delivery?.distanceKm != null ? `${data.delivery.distanceKm} km` : '-'
                    }
                  />
                  <DetailRow label="ETA" value={data.delivery?.estimatedDeliveryWindow || '-'} />
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <h4 className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-950">
                Items
              </h4>
              <div className="divide-y divide-slate-100">
                {(data.items ?? []).map((item) => (
                  <div className="flex justify-between gap-4 px-5 py-4 text-sm" key={item.id}>
                    <div>
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="text-slate-500">
                        Qty {item.quantity}
                        {item.variantName ? ` · ${item.variantName}` : ''}
                      </p>
                      {item.addons?.length ? (
                        <p className="text-slate-500">{item.addons.join(', ')}</p>
                      ) : null}
                    </div>
                    <p className="font-semibold text-slate-950">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-950">
                  {formatCurrency(data.billing?.finalAmount)}
                </span>{' '}
                · {formatLabel(data.billing?.paymentMethod)} /{' '}
                {formatLabel(data.billing?.paymentStatus)}
              </div>
              <div className="flex gap-3">
                {nextAction ? (
                  <Button disabled={actionLoading} onClick={runNextAction}>
                    {nextAction.label}
                  </Button>
                ) : null}
                <Button onClick={onClose} variant="secondary">
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DeliveryOrdersPage() {
  const [filters, setFilters] = useState({
    status: '',
    limit: 20,
    offset: 0,
  });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [acceptOrder, acceptState] = useAcceptMyDeliveryOrderMutation();
  const [updateStatus, updateStatusState] = useUpdateMyDeliveryOrderStatusMutation();
  const queryParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== '' && value !== null && value !== undefined,
        ),
      ),
    [filters],
  );
  const { data, isFetching, error } = useListMyDeliveryOrdersQuery(queryParams, {
    pollingInterval: 15000,
  });
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const offset = data?.offset ?? filters.offset;
  const limit = data?.limit ?? filters.limit;
  const actionError = acceptState.error || updateStatusState.error;
  const isUpdating = acceptState.isLoading || updateStatusState.isLoading;

  const runRowAction = async (order) => {
    const nextAction = getNextDeliveryAction(order.deliveryStatus);

    if (!nextAction) {
      return;
    }

    if (nextAction.action === 'accept') {
      await acceptOrder(order.orderId).unwrap();
      return;
    }

    await updateStatus({ orderId: order.orderId, status: nextAction.status }).unwrap();
  };

  return (
    <div className="space-y-6">
      <Card eyebrow="Delivery" title="Assigned Orders">
        <div className="mb-5 max-w-xs">
          <SelectField
            label="Status"
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value, offset: 0 }))
            }
            options={deliveryStatusOptions}
            value={filters.status}
          />
        </div>

        {isFetching ? <Loader label="Refreshing assigned orders..." /> : null}
        {error ? (
          <ErrorState
            message={error?.data?.message || error?.error || 'Unable to load assigned orders.'}
          />
        ) : null}
        {actionError ? (
          <div className="mb-4">
            <ErrorState
              message={
                actionError?.data?.message ||
                actionError?.error ||
                'Unable to update this delivery.'
              }
            />
          </div>
        ) : null}

        <DeliveryOrderList
          actionLoading={isUpdating}
          onOpenOrder={setSelectedOrderId}
          onRunAction={runRowAction}
          orders={orders}
          showActions
          emptyMessage="No delivery orders match this filter."
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing {total > 0 ? offset + 1 : 0}-{Math.min(offset + limit, total)} of {total} orders
          </p>
          <div className="flex gap-2">
            <Button
              disabled={offset <= 0}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: Math.max(0, current.offset - current.limit),
                }))
              }
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={offset + limit >= total}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  offset: current.offset + current.limit,
                }))
              }
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <DeliveryOrderDetailsModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}

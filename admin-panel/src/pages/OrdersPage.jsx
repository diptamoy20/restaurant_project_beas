import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { PermissionGate } from '../components/PermissionGate';
import { useGetOrderByIdQuery, useUpdateOrderStatusMutation } from '../services/orderApi';

const statusClasses = {
  PLACED: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  COMPLETED: 'bg-slate-200 text-slate-700',
};

export function OrdersPage() {
  const [inputOrderId, setInputOrderId] = useState('1');
  const [selectedOrderId, setSelectedOrderId] = useState('1');
  const [updateOrderStatus, { error: actionError, isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const { data, isFetching, error } = useGetOrderByIdQuery(selectedOrderId, {
    skip: !selectedOrderId,
    pollingInterval: 15000,
  });

  const handleWatch = (event) => {
    event.preventDefault();
    setSelectedOrderId(inputOrderId);
  };

  const handleAction = async (status) => {
    await updateOrderStatus({ orderId: selectedOrderId, status });
  };

  const itemRows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Live Dashboard"
        title="Order management"
        actions={
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleWatch}>
            <TextField
              className="min-w-[200px]"
              label="Track order by ID"
              onChange={(event) => setInputOrderId(event.target.value)}
              value={inputOrderId}
            />
            <Button type="submit">Watch</Button>
          </form>
        }
      >
        {isFetching ? <Loader label="Refreshing order data..." /> : null}
        {error ? (
          <ErrorState message={error?.data?.message || error?.error || 'Order data could not be loaded.'} />
        ) : null}
        {!data && !isFetching && !error ? (
          <EmptyState
            description="Enter an order ID to fetch the current order snapshot from the API."
            title="No order selected"
          />
        ) : null}

        {data ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current order</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{data.orderNumber ?? `Order #${data.id}`}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[data.status] ?? 'bg-slate-200 text-slate-700'}`}>
                    {data.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total</p>
                    <p className="mt-1 font-semibold text-slate-950">Rs. {data.finalAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Payment</p>
                    <p className="mt-1 font-semibold text-slate-950">{data.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Type</p>
                    <p className="mt-1 font-semibold text-slate-950">{data.orderType}</p>
                  </div>
                </div>
              </div>

              <Table
                columns={[
                  { key: 'menuItem', header: 'Item', render: (row) => row.menuItem?.name ?? 'Menu item' },
                  { key: 'quantity', header: 'Qty' },
                  { key: 'price', header: 'Price', render: (row) => `Rs. ${row.price}` },
                  { key: 'totalPrice', header: 'Line Total', render: (row) => `Rs. ${row.totalPrice}` },
                ]}
                data={itemRows}
                emptyMessage="This order does not contain any line items."
              />
            </div>

            <Card eyebrow="Actions" title="Fulfilment controls">
              <div className="space-y-3">
                <PermissionGate
                  action="accept"
                  fallback={<p className="text-sm text-slate-500">Your role can view order details but cannot accept orders.</p>}
                  module="orders"
                >
                  <Button className="w-full" disabled={isUpdating} onClick={() => handleAction('ACCEPTED')}>
                    Accept order
                  </Button>
                </PermissionGate>
                <PermissionGate module="orders" action="reject">
                  <Button className="w-full" disabled={isUpdating} onClick={() => handleAction('REJECTED')} variant="danger">
                    Reject order
                  </Button>
                </PermissionGate>
                {actionError ? (
                  <ErrorState
                    message={
                      actionError?.data?.message ||
                      actionError?.error ||
                      'The current backend does not expose an order status update endpoint yet.'
                    }
                  />
                ) : null}
                <p className="text-sm text-slate-500">
                  The page polls the API every 15 seconds so the kitchen or manager dashboard stays fresh.
                </p>
              </div>
            </Card>
          </div>
        ) : null}
      </Card>
    </div>
  );
}


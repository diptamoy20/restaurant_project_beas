import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { PermissionGate } from '../components/PermissionGate';
import { socket } from '../lib/socket';
import {
  useGetOrderByIdQuery,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} from '../services/orderApi';

const statusClasses = {
  PLACED: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  PREPARING: 'bg-violet-100 text-violet-800',
  READY: 'bg-emerald-100 text-emerald-800',
  SERVED: 'bg-slate-200 text-slate-700',
};
const statusFlow = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'];
const statusLabels = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
};

export function OrdersPage() {
  const token = useSelector((state) => state.auth.token);
  const [inputOrderId, setInputOrderId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [liveOrders, setLiveOrders] = useState([]);
  const [socketStatus, setSocketStatus] = useState('Connecting to live kitchen feed...');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const [updateOrderStatus, { error: actionError, isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const { data: initialOrders, isLoading, isFetching, error } = useListOrdersQuery({ limit: 25 });
  const { data: fetchedOrder, error: selectedOrderError } = useGetOrderByIdQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });

  useEffect(() => {
    if (Array.isArray(initialOrders)) {
      setLiveOrders(initialOrders);

      if (!selectedOrderId && initialOrders[0]?.id) {
        setSelectedOrderId(String(initialOrders[0].id));
        setInputOrderId(String(initialOrders[0].id));
      }
    }
  }, [initialOrders, selectedOrderId]);

  useEffect(() => {
    if (fetchedOrder) {
      setLiveOrders((currentOrders) => mergeOrders(currentOrders, fetchedOrder));
    }
  }, [fetchedOrder]);

  useEffect(() => {
    socket.auth = token ? { token } : {};

    const joinAdminRoom = () => {
      socket.emit('joinAdmin', {
        token: import.meta.env.VITE_ADMIN_SOCKET_TOKEN || '',
      });
      setSocketStatus('Live kitchen feed connected.');
    };

    const handleNewOrder = (incomingOrder) => {
      setLiveOrders((currentOrders) => mergeOrders(currentOrders, incomingOrder));
      setSocketStatus(`New order ${incomingOrder.orderNumber ?? `#${incomingOrder.id}`} received.`);

      if (!selectedOrderId) {
        setSelectedOrderId(String(incomingOrder.id));
        setInputOrderId(String(incomingOrder.id));
      }

      if (soundEnabled) {
        playNotificationTone(audioContextRef);
      }
    };

    const handleOrderUpdate = (incomingOrder) => {
      setLiveOrders((currentOrders) => mergeOrders(currentOrders, incomingOrder));
      setSocketStatus(
        `Order ${incomingOrder.orderNumber ?? `#${incomingOrder.id}`} moved to ${formatStatus(incomingOrder.status)}.`,
      );
    };

    const handleSocketError = (payload) => {
      setSocketStatus(payload?.message || 'Realtime updates are unavailable right now.');
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', joinAdminRoom);
    socket.on('newOrder', handleNewOrder);
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('socketError', handleSocketError);

    if (socket.connected) {
      joinAdminRoom();
    }

    return () => {
      socket.off('connect', joinAdminRoom);
      socket.off('newOrder', handleNewOrder);
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('socketError', handleSocketError);
    };
  }, [selectedOrderId, soundEnabled, token]);

  const handleWatch = (event) => {
    event.preventDefault();
    setSelectedOrderId(inputOrderId);
  };

  const handleAction = async (status) => {
    const updatedOrder = await updateOrderStatus({ orderId: selectedOrderId, status }).unwrap();
    setLiveOrders((currentOrders) => mergeOrders(currentOrders, updatedOrder));
  };

  const normalizedLiveOrders = Array.isArray(liveOrders) ? liveOrders : [];
  const selectedOrder = useMemo(
    () =>
      normalizedLiveOrders.find((order) => String(order.id) === String(selectedOrderId)) ??
      fetchedOrder ??
      null,
    [fetchedOrder, normalizedLiveOrders, selectedOrderId],
  );
  const itemRows = selectedOrder?.items ?? [];
  const currentStepIndex = selectedOrder ? statusFlow.indexOf(selectedOrder.status) : -1;
  const nextStatuses =
    currentStepIndex >= 0 && currentStepIndex < statusFlow.length - 1
      ? [statusFlow[currentStepIndex + 1]]
      : [];

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Live Dashboard"
        title="Order management"
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <form className="flex flex-wrap items-end gap-3" onSubmit={handleWatch}>
              <TextField
                className="min-w-[200px]"
                label="Track order by ID"
                onChange={(event) => setInputOrderId(event.target.value)}
                value={inputOrderId}
              />
              <Button type="submit">Watch</Button>
            </form>
            <Button
              onClick={() => {
                setSoundEnabled((current) => !current);
                primeAudioContext(audioContextRef);
              }}
              variant={soundEnabled ? 'primary' : 'secondary'}
            >
              {soundEnabled ? 'Sound enabled' : 'Enable sound'}
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>{socketStatus}</span>
          <span>
            {isFetching ? 'Refreshing recent orders...' : `${normalizedLiveOrders.length} live orders loaded`}
          </span>
        </div>
        {isLoading ? <Loader label="Loading recent orders..." /> : null}
        {error ? <ErrorState message={error?.data?.message || error?.error || 'Order feed could not be loaded.'} /> : null}
        {selectedOrderError && !selectedOrder ? (
          <ErrorState
            message={
              selectedOrderError?.data?.message ||
              selectedOrderError?.error ||
              'The selected order could not be loaded.'
            }
          />
        ) : null}
        {!selectedOrder && !isLoading && !error ? (
          <EmptyState
            description="Recent orders will appear here as soon as the kitchen feed is connected."
            title="No order selected yet"
          />
        ) : null}

        <div className="mb-6">
          <Table
            columns={[
              {
                key: 'order',
                header: 'Order',
                render: (row) => (
                  <button
                    type="button"
                    className="rounded-xl bg-transparent px-0 py-0 text-left text-sm font-semibold text-slate-900 shadow-none hover:translate-y-0 hover:bg-transparent hover:shadow-none"
                    onClick={() => {
                      setSelectedOrderId(String(row.id));
                      setInputOrderId(String(row.id));
                    }}
                  >
                    {row.orderNumber ?? `Order #${row.id}`}
                  </button>
                ),
              },
              {
                key: 'tableId',
                header: 'Table',
                render: (row) => (row.tableId ? `Table ${row.tableId}` : row.orderType),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[row.status] ?? 'bg-slate-200 text-slate-700'}`}>
                    {formatStatus(row.status)}
                  </span>
                ),
              },
              {
                key: 'finalAmount',
                header: 'Total',
                render: (row) => `Rs. ${Number(row.finalAmount).toFixed(2)}`,
              },
              {
                key: 'updatedAt',
                header: 'Updated',
                render: (row) => formatTime(row.updatedAt),
              },
            ]}
            data={normalizedLiveOrders}
            emptyMessage="Realtime orders will populate here after the backend feed connects."
          />
        </div>

        {selectedOrder ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current order</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">
                      {selectedOrder.orderNumber ?? `Order #${selectedOrder.id}`}
                    </h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[selectedOrder.status] ?? 'bg-slate-200 text-slate-700'}`}>
                    {formatStatus(selectedOrder.status)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total</p>
                    <p className="mt-1 font-semibold text-slate-950">Rs. {Number(selectedOrder.finalAmount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Payment</p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedOrder.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Type</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {selectedOrder.tableId ? `Table ${selectedOrder.tableId}` : selectedOrder.orderType}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {statusFlow.map((status, index) => (
                    <span
                      key={status}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        index <= currentStepIndex ? 'bg-slate-950 text-white' : 'bg-white text-slate-400'
                      }`}
                    >
                      {statusLabels[status]}
                    </span>
                  ))}
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
                  fallback={<p className="text-sm text-slate-500">Your role can view order details but cannot move fulfilment forward.</p>}
                  module="orders"
                >
                  {nextStatuses.length > 0 ? (
                    nextStatuses.map((status) => (
                      <Button className="w-full" disabled={isUpdating} key={status} onClick={() => handleAction(status)}>
                        Mark as {statusLabels[status]}
                      </Button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      This order has completed the live tracking flow.
                    </div>
                  )}
                </PermissionGate>
                {actionError ? (
                  <ErrorState
                    message={
                      actionError?.data?.message || actionError?.error || 'Order status could not be updated.'
                    }
                  />
                ) : null}
                <p className="text-sm text-slate-500">
                  Status changes emit instantly to both the admin room and the active customer table room.
                </p>
              </div>
            </Card>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function mergeOrders(currentOrders, incomingOrder) {
  const nextOrders = Array.isArray(currentOrders) ? [...currentOrders] : [];
  const existingIndex = nextOrders.findIndex((order) => Number(order.id) === Number(incomingOrder.id));

  if (existingIndex >= 0) {
    nextOrders[existingIndex] = incomingOrder;
  } else {
    nextOrders.unshift(incomingOrder);
  }

  return nextOrders.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
}

function formatStatus(status) {
  return statusLabels[status] ?? status;
}

function formatTime(value) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleTimeString();
}

function primeAudioContext(audioContextRef) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextClass();
  }

  if (audioContextRef.current.state === 'suspended') {
    audioContextRef.current.resume().catch(() => undefined);
  }
}

function playNotificationTone(audioContextRef) {
  primeAudioContext(audioContextRef);

  const context = audioContextRef.current;

  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.25);
}

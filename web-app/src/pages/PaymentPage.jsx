import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { api } from '../lib/api';
import { socket } from '../lib/socket';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';
const ORDER_STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'];
const ORDER_STEP_LABELS = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
};

export function PaymentPage() {
  const { orderId } = useParams();
  const token = useSelector((state) => state.auth.token);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketMessage, setSocketMessage] = useState('Connecting to live order tracking...');
  const [errorMessage, setErrorMessage] = useState('');
  const orderSnapshot = useMemo(() => {
    const raw = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);
  const activeTableId = order?.tableId ?? orderSnapshot?.tableId;

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const response = await api.get(`/orders/${orderId}`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        if (isMounted) {
          setOrder(response);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'We could not load this order just now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, token]);

  useEffect(() => {
    if (!activeTableId) {
      setSocketMessage('Tracking will go live once the table ID is available.');
      return undefined;
    }

    const joinTableRoom = () => {
      socket.emit('joinTable', { tableId: activeTableId });
      setSocketMessage(`Live updates connected for table ${activeTableId}.`);
    };

    const handleOrderUpdate = (incomingOrder) => {
      if (Number(incomingOrder.id) !== Number(orderId)) {
        return;
      }

      setOrder(incomingOrder);
      setSocketMessage(`Order updated to ${formatStatus(incomingOrder.status)}.`);
      sessionStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId: incomingOrder.id,
          tableId: incomingOrder.tableId,
          orderNumber: incomingOrder.orderNumber,
          totalAmount: incomingOrder.finalAmount,
          paymentStatus: incomingOrder.paymentStatus,
          status: incomingOrder.status,
          createdAt: incomingOrder.createdAt,
          updatedAt: incomingOrder.updatedAt,
        }),
      );
    };

    const handleSocketError = (payload) => {
      setSocketMessage(payload?.message || 'Realtime tracking is temporarily unavailable.');
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', joinTableRoom);
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('socketError', handleSocketError);

    if (socket.connected) {
      joinTableRoom();
    }

    return () => {
      socket.off('connect', joinTableRoom);
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('socketError', handleSocketError);
    };
  }, [activeTableId, orderId]);

  const currentOrder = order ?? orderSnapshot;
  const currentStepIndex = currentOrder?.status ? ORDER_STEPS.indexOf(currentOrder.status) : 0;
  const orderItems = order?.items ?? [];
  const orderNumber = currentOrder?.orderNumber ?? `Order #${orderId}`;
  const updatedAt = currentOrder?.updatedAt ?? currentOrder?.createdAt;

  return (
    <section className="payment-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Payment</p>
          <h2>{orderNumber}</h2>
          <p className="cart-supporting-copy">
            Follow your kitchen progress in real time while payment stays ready for the next integration step.
          </p>
        </div>
      </div>

      {errorMessage ? <div className="order-status-banner error">{errorMessage}</div> : null}
      {socketMessage ? <div className="order-status-banner success">{socketMessage}</div> : null}

      <div className="payment-layout">
        <div className="payment-card tracking-card">
          <div className="tracking-header">
            <div>
              <p className="eyebrow">Live tracking</p>
              <h3>{currentOrder?.status ? formatStatus(currentOrder.status) : 'Waiting for status'}</h3>
            </div>
            <span className="tracking-badge">
              {activeTableId ? `Table ${activeTableId}` : 'Takeaway / Delivery'}
            </span>
          </div>

          <div className="tracking-stepper" role="list" aria-label="Order progress">
            {ORDER_STEPS.map((step, index) => {
              const isComplete = index <= currentStepIndex;
              const isCurrent = step === currentOrder?.status;

              return (
                <div
                  key={step}
                  className={`tracking-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
                  role="listitem"
                >
                  <span className="tracking-step-dot">{index + 1}</span>
                  <div>
                    <strong>{ORDER_STEP_LABELS[step]}</strong>
                    <p>{resolveStepTimestamp(step, order)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {loading ? <p className="tracking-copy">Loading the latest order snapshot...</p> : null}
          {!loading && currentOrder ? (
            <div className="tracking-meta-grid">
              <div className="tracking-meta-card">
                <span>Order ID</span>
                <strong>{orderId}</strong>
              </div>
              <div className="tracking-meta-card">
                <span>Last updated</span>
                <strong>{formatTimestamp(updatedAt)}</strong>
              </div>
              <div className="tracking-meta-card">
                <span>Payment</span>
                <strong>{currentOrder.paymentStatus ?? 'PENDING'}</strong>
              </div>
            </div>
          ) : null}
        </div>

        <div className="stack payment-side-stack">
          <div className="payment-card">
            <div className="total-row">
              <span>Current payment status</span>
              <strong>{currentOrder?.paymentStatus ?? 'PENDING'}</strong>
            </div>
            <div className="total-row total-row-highlighted">
              <span>Amount to pay</span>
              <strong>${Number(currentOrder?.finalAmount ?? currentOrder?.totalAmount ?? 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="payment-card">
            <p className="eyebrow">Order summary</p>
            <div className="payment-summary-list">
              {orderItems.length > 0 ? (
                orderItems.map((item) => (
                  <div className="line-item" key={item.id}>
                    <div>
                      <strong>{item.menuItem?.name ?? `Menu item #${item.menuItemId}`}</strong>
                      <p className="line-item-meta">
                        {item.quantity} x ${Number(item.price).toFixed(2)}
                      </p>
                    </div>
                    <strong>${Number(item.totalPrice).toFixed(2)}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state">Order item details will appear here once the order is loaded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatStatus(status) {
  return ORDER_STEP_LABELS[status] ?? status ?? 'Unknown';
}

function formatTimestamp(value) {
  if (!value) {
    return 'Waiting...';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Waiting...';
  }

  return date.toLocaleString();
}

function resolveStepTimestamp(step, order) {
  const matchingLog = order?.statusLogs?.find((entry) => entry.status === step);
  return matchingLog?.changedAt ? formatTimestamp(matchingLog.changedAt) : 'Pending';
}

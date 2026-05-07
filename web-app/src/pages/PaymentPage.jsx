import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getOrder } from '../store/slices/orderSlice';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';

export function PaymentPage() {
  const dispatch = useDispatch();
  const { orderId } = useParams();
  const { currentOrder, loading, error } = useSelector((state) => state.orders);
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
  const order = currentOrder?.id === Number(orderId) ? currentOrder : null;
  const displayStatus =
    order?.paymentStatus === 'PENDING' && orderSnapshot?.paymentStatus
      ? orderSnapshot.paymentStatus
      : order?.paymentStatus ?? orderSnapshot?.paymentStatus ?? 'PENDING';
  const displayAmount = order?.finalAmount ?? orderSnapshot?.totalAmount ?? 0;

  useEffect(() => {
    if (orderId) {
      dispatch(getOrder(orderId));
    }
  }, [dispatch, orderId]);

  return (
    <section className="payment-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Payment</p>
          <h2>Order #{orderId}</h2>
          <p className="cart-supporting-copy">
            {loading ? 'Refreshing order status...' : 'Your checkout details are confirmed.'}
          </p>
        </div>
      </div>

      {error ? <div className="order-status-banner error">{error}</div> : null}
      <div className="payment-card">
        <div className="total-row">
          <span>Order ID</span>
          <strong>{order?.orderNumber || orderId}</strong>
        </div>
        <div className="total-row">
          <span>Current payment status</span>
          <strong>{displayStatus}</strong>
        </div>
        <div className="total-row total-row-highlighted">
          <span>Amount to pay</span>
          <strong>${displayAmount.toFixed(2)}</strong>
        </div>
      </div>
    </section>
  );
}

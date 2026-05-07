import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder } from '../store/slices/orderSlice';
import { useRazorpayPayment } from '../hooks/useRazorpayPayment';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';

export function PaymentPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { startRazorpayPayment } = useRazorpayPayment();
  const user = useSelector((state) => state.auth.user);
  const { currentOrder, loading, error } = useSelector((state) => state.orders);
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
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

  const retryPayment = async () => {
    if (!order || !user) {
      return;
    }

    setPaymentLoading(true);
    setStatusMessage('Opening payment gateway...');
    try {
      await startRazorpayPayment({
        order,
        user,
        onSuccess: () => setStatusMessage('Payment successful. Refreshing status...'),
        onFailure: (message) => setStatusMessage(message),
      });
      await dispatch(getOrder(order.id)).unwrap();
      setStatusMessage('Payment successful.');
      navigate(`/orders`, { replace: true });
    } catch (paymentError) {
      setStatusMessage(paymentError?.message || 'Unable to complete payment');
    } finally {
      setPaymentLoading(false);
    }
  };

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
        {displayStatus !== 'PAID' ? (
          <button
            type="button"
            className="place-order-button"
            disabled={paymentLoading || loading}
            onClick={retryPayment}
          >
            {paymentLoading ? 'Retrying...' : 'Retry payment'}
          </button>
        ) : null}
        {statusMessage ? <div className="order-status-banner success">{statusMessage}</div> : null}
      </div>
    </section>
  );
}

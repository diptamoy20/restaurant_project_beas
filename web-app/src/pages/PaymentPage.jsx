import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';

export function PaymentPage() {
  const { orderId } = useParams();
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

  return (
    <section className="payment-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Payment</p>
          <h2>Order #{orderId}</h2>
          <p className="cart-supporting-copy">
            Payment integration is ready for the next step. The order ID is already stored
            so `paymentStatus` can be updated to paid later.
          </p>
        </div>
      </div>

      <div className="payment-card">
        <div className="total-row">
          <span>Order ID</span>
          <strong>{orderId}</strong>
        </div>
        <div className="total-row">
          <span>Current payment status</span>
          <strong>{orderSnapshot?.paymentStatus ?? 'unpaid'}</strong>
        </div>
        <div className="total-row total-row-highlighted">
          <span>Amount to pay</span>
          <strong>${(orderSnapshot?.totalAmount ?? 0).toFixed(2)}</strong>
        </div>
      </div>
    </section>
  );
}

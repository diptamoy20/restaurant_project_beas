import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ORDER_SUCCESS_STORAGE_KEY } from '../constants/storage';
import { useCart } from '../hooks/useCart';
import type { QRStoredOrderSuccess } from '../types/order.types';
import { formatCurrency } from '../utils/formatters';

function readLastOrder(): QRStoredOrderSuccess | null {
  try {
    const stored = localStorage.getItem(ORDER_SUCCESS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as QRStoredOrderSuccess) : null;
  } catch {
    return null;
  }
}

export function OrderSuccessPage() {
  const navigate = useNavigate();
  const { restaurantId, tableId, tableLabel } = useCart();
  const order = useMemo(() => readLastOrder(), []);
  const menuPath = restaurantId && tableId ? `/menu/${restaurantId}/${tableId}` : '/menu/1/1';

  return (
    <main className="qr-success-page">
      <div className="qr-confetti" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <section className="qr-success-content">
        <div className="qr-success-check">✓</div>
        <h1>Order Placed Successfully!</h1>
        <div className="qr-success-card">
          <div>
            <span>▤</span>
            <p>Order ID</p>
            <strong>{order?.orderNumber ?? (order?.orderId ? `#${order.orderId}` : '#A102')}</strong>
          </div>
          <div>
            <span>⌗</span>
            <p>Table</p>
            <strong>{order?.tableName ?? tableLabel ?? 'Table'}</strong>
          </div>
          <div>
            <span>◷</span>
            <p>Estimated Time</p>
            <strong className="is-hot">{order?.estimatedTime ?? 20} mins</strong>
          </div>
          {order?.finalAmount ? (
            <div>
              <span>₹</span>
              <p>Final Amount</p>
              <strong>{formatCurrency(order.finalAmount)}</strong>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={() => navigate(menuPath)}>
          Back to menu
        </button>
        <p className="qr-thank-you">♡ Thank You!</p>
      </section>
    </main>
  );
}

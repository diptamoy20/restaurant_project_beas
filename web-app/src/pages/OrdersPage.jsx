import { useCallback, useEffect, useMemo, useState } from "react";

import { orderApi } from "../services/orderApi";
import { formatDateTime } from "../utils/date";

const STATUS_THEME = {
  PENDING: { label: 'Pending', className: 'order-chip order-chip--pending' },
  PLACED: { label: 'Pending', className: 'order-chip order-chip--pending' },
  ACCEPTED: { label: 'Accepted', className: 'order-chip order-chip--accepted' },
  PREPARING: { label: 'Preparing', className: 'order-chip order-chip--preparing' },
  ON_THE_WAY: { label: 'On the way', className: 'order-chip order-chip--delivery' },
  DELIVERED: { label: 'Delivered', className: 'order-chip order-chip--done' },
  CANCELLED: { label: 'Cancelled', className: 'order-chip order-chip--cancelled' },
};

const POLL_MS = 22_000;
const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await orderApi.getMyOrders();

      setOrders(Array.isArray(rows) ? rows : []);
      setError(null);
    } catch (requestError) {
      setError(requestError.message ?? "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      load();
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, [load]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [orders],
  );

  return (
    <section className="orders-page stack">
      <div className="section-heading">
        <p className="eyebrow">Orders</p>
        <h2>Your orders</h2>
        <p className="copy orders-page-lede">
          Status updates refresh automatically every{" "}
          {Math.round(POLL_MS / 1000)} seconds while this page stays open.
        </p>
      </div>

      {loading ? (
        <p className="copy-muted">Gathering your kitchen tickets…</p>
      ) : null}

      {error ? <div className="order-status-banner error">{error}</div> : null}

      {!loading && !error && sortedOrders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p className="copy">
            Once you complete checkout, each order shows up here with live
            status from the restaurant team.
          </p>
        </div>
      ) : null}

      <div className="orders-grid">
        {sortedOrders.map((order) => (
          <article key={order.id} className="order-card">
            <header className="order-card-header">
              <div>
                <p className="order-card-eyebrow">{order.orderNumber}</p>
                <h3>
                  {order.restaurant?.name ??
                    `Restaurant #${order.restaurantId}`}
                </h3>
              </div>

              <span
                className={
                  STATUS_THEME[order.status]?.className ??
                  "order-chip order-chip--pending"
                }
              >
                {STATUS_THEME[order.status]?.label ?? order.status}
              </span>
            </header>

            <ul className="order-lines">
              {(order.items ?? []).map((line) => (
                <li key={line.id}>
                  <span>
                    {line.menuItem?.name ?? "Item"} × {line.quantity}
                  </span>
                  <span>{formatCurrency.format(line.totalPrice)}</span>
                </li>
              ))}
            </ul>

            <footer className="order-card-footer">
              <div>
                <p className="order-meta-label">Total</p>
                <p className="order-meta-value">
                  {formatCurrency.format(order.finalAmount)}
                </p>
              </div>
              <div>
                <p className="order-meta-label">Placed</p>
                <p className="order-meta-value">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div>
                <p className="order-meta-label">ETA</p>
                <p className="order-meta-value">
                  {order.estimatedDeliveryMinutes
                    ? `~${order.estimatedDeliveryMinutes} min`
                    : "—"}
                </p>
              </div>
            </footer>
            {order.cancellationReason ? (
              <div className="order-status-banner error">
                Cancelled: {order.cancellationReason}
              </div>
            ) : null}
            <div className="order-button-wrapper">
              <button
                type="button"
                className="ghost-button"
                disabled={order.paymentStatus !== "PAID"}
                onClick={async () => {
                  setDownloadError("");
                  try {
                    await orderApi.downloadInvoice(order.id);
                  } catch (invoiceError) {
                    setDownloadError(
                      invoiceError.message || "Invoice download failed.",
                    );
                  }
                }}
              >
                {order.paymentStatus === "PAID"
                  ? "Download Invoice"
                  : "Invoice pending"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {downloadError ? (
        <div className="order-status-banner error">{downloadError}</div>
      ) : null}
    </section>
  );
}

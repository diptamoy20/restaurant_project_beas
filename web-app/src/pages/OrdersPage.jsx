import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { orderApi } from "../services/orderApi";
import { formatDateTime } from "../utils/date";
import { isOrderTrackable } from "../utils/trackOrder";

const TrackOrderModal = lazy(() =>
  import("../components/TrackOrder/TrackOrderModal").then((module) => ({
    default: module.TrackOrderModal,
  })),
);

const STATUS_THEME = {
  PENDING: { label: 'Pending', className: 'order-chip order-chip--pending' },
  PLACED: { label: 'Pending', className: 'order-chip order-chip--pending' },
  ACCEPTED: { label: 'Accepted', className: 'order-chip order-chip--accepted' },
  PREPARING: { label: 'Preparing', className: 'order-chip order-chip--preparing' },
  ON_THE_WAY: { label: 'On the way', className: 'order-chip order-chip--delivery' },
  DELIVERED: { label: 'Delivered', className: 'order-chip order-chip--done' },
  CANCELLED: { label: 'Cancelled', className: 'order-chip order-chip--cancelled' },
  SERVED: { label: 'Served', className: 'order-chip order-chip--done' },
};

const POLL_MS = 22_000;
const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Renders a single bill row. Hidden when value is null/undefined/0 and hideZero=true */
function BillRow({ label, value, isDiscount = false, isMuted = false, isPayable = false, hideZero = true, prefix = "" }) {
  if (hideZero && (value == null || Number(value) === 0)) return null;
  const className = [
    "bill-row",
    isDiscount ? "bill-row-discount" : "",
    isMuted ? "bill-row-muted" : "",
    isPayable ? "bill-row-payable" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <span>{label}</span>
      <i aria-hidden="true" />
      <strong>
        {isDiscount ? "-" : prefix}
        {formatCurrency.format(Math.abs(Number(value)))}
      </strong>
    </div>
  );
}

/** Full pricing breakdown panel — same pattern as CheckoutPage bill-summary */
function OrderPricingBreakdown({ order }) {
  const hasMenuDiscount = Number(order.menuDiscountAmount) > 0;
  const hasCoupon = Number(order.couponDiscountAmount) > 0;
  const hasManualDiscount = Number(order.manualDiscountAmount) > 0;
  const hasDelivery = order.orderType === "DELIVERY";
  const hasPackaging = Number(order.packagingCharge) > 0;
  const hasTip = Number(order.tipAmount) > 0;
  const hasTax = Number(order.taxAmount) > 0;
  const hasIgst = Number(order.igstAmount) > 0;
  const hasPlatformFee = Number(order.platformFee) > 0;
  const hasOtherTaxes = Number(order.otherTaxes) > 0;

  return (
    <div className="bill-summary-rows order-card-bill-rows">
      {/* Items total (MRP subtotal before discounts) */}
      <BillRow label="Items total" value={order.subtotalAmount ?? order.totalAmount} hideZero={false} />

      {/* Menu / item-level discount */}
      {hasMenuDiscount && (
        <BillRow label="Item discount" value={order.menuDiscountAmount} isDiscount />
      )}

      {/* Coupon discount */}
      {hasCoupon && (
        <BillRow
          label={order.couponDiscountAmount > 0 ? `Coupon${order.couponCode ? ` (${order.couponCode})` : ""}` : "Coupon"}
          value={order.couponDiscountAmount}
          isDiscount
        />
      )}

      {/* Manual discount (admin) */}
      {hasManualDiscount && (
        <BillRow label="Discount" value={order.manualDiscountAmount} isDiscount />
      )}

      {/* Delivery charge */}
      {hasDelivery && (
        <div className="bill-row">
          <span>Delivery</span>
          <i aria-hidden="true" />
          <strong>
            {Number(order.deliveryCharge) === 0
              ? "Free"
              : formatCurrency.format(order.deliveryCharge)}
          </strong>
        </div>
      )}

      {/* Packaging charge */}
      {hasPackaging && (
        <BillRow label="Packaging" value={order.packagingCharge} />
      )}

      {/* Tip */}
      {hasTip && <BillRow label="Tip" value={order.tipAmount} />}

      {/* Taxes — top-level row */}
      {hasTax && (
        <>
          <BillRow label="Taxes" value={order.taxAmount} hideZero={false} />
          <div className="bill-tax-breakup">
            {Number(order.cgstAmount) > 0 && (
              <BillRow
                label={`CGST${order.gstRate ? ` (${Number(order.gstRate) / 2}%)` : ""}`}
                value={order.cgstAmount}
                isMuted
              />
            )}
            {Number(order.sgstAmount) > 0 && (
              <BillRow
                label={`SGST${order.gstRate ? ` (${Number(order.gstRate) / 2}%)` : ""}`}
                value={order.sgstAmount}
                isMuted
              />
            )}
            {hasIgst && (
              <BillRow
                label={`IGST${order.gstRate ? ` (${order.gstRate}%)` : ""}`}
                value={order.igstAmount}
                isMuted
              />
            )}
            {hasOtherTaxes && (
              <BillRow
                label="Other Taxes"
                value={order.otherTaxes}
                isMuted
              />
            )}
          </div>
        </>
      )}

      {/* Platform fee (if applicable) */}
      {hasPlatformFee && (
        <BillRow label="Platform fee" value={order.platformFee} />
      )}

      {/* Grand total */}
      <BillRow label="Total paid" value={order.finalAmount} isPayable hideZero={false} />
    </div>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  // Track which order cards have the breakdown expanded
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [trackOrder, setTrackOrder] = useState(null);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const handleTrackedOrderUpdate = useCallback((updatedOrder) => {
    if (!updatedOrder?.id) {
      return;
    }

    setOrders((previous) =>
      previous.map((entry) =>
        entry.id === updatedOrder.id
          ? {
              ...entry,
              ...updatedOrder,
              status: updatedOrder.status ?? entry.status,
              paymentStatus: updatedOrder.paymentStatus ?? entry.paymentStatus,
            }
          : entry,
      ),
    );
  }, []);

  return (
    <section className="orders-page stack">
      <div className="section-heading">
        <p className="eyebrow">Orders</p>
        <h2>Your orders</h2>
        {/* <p className="copy orders-page-lede">
          Status updates refresh automatically every{" "}
          {Math.round(POLL_MS / 1000)} seconds while this page stays open.
        </p> */}
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
        {sortedOrders.map((order) => {
          const isExpanded = expandedIds.has(order.id);
          const deliveredAt = order.deliveredAt
            ? formatDateTime(order.deliveredAt)
            : null;

          return (
            <article key={order.id} className="order-card">
              {/* ── Header ───────────────────────────────────────── */}
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

              {/* ── Ordered items ─────────────────────────────────── */}
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

              {/* ── Pricing breakdown (collapsible) ───────────────── */}
              <div className="order-card-breakdown">
                <button
                  type="button"
                  className="order-breakdown-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpanded(order.id)}
                >
                  {isExpanded ? "Hide" : "View"} price breakdown
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    style={{
                      width: "1rem",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {isExpanded && <OrderPricingBreakdown order={order} />}
              </div>

              {isOrderTrackable(order) ? (
                <div className="order-card-track">
                  <button
                    type="button"
                    className="track-order-button"
                    onClick={() => setTrackOrder(order)}
                  >
                    Track Order
                  </button>
                </div>
              ) : null}

              {/* ── Meta footer ───────────────────────────────────── */}
              <footer className="order-card-footer">
                <div>
                  <p className="order-meta-label">Total paid</p>
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
                  <p className="order-meta-label">
                    {deliveredAt ? "Delivered" : "ETA"}
                  </p>
                  <p className="order-meta-value">
                    {deliveredAt
                      ? deliveredAt
                      : order.estimatedDeliveryMinutes
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
          );
        })}
      </div>

      {downloadError ? (
        <div className="order-status-banner error">{downloadError}</div>
      ) : null}

      <Suspense fallback={null}>
        <TrackOrderModal
          open={Boolean(trackOrder)}
          order={trackOrder}
          onClose={() => setTrackOrder(null)}
          onOrderUpdated={handleTrackedOrderUpdate}
        />
      </Suspense>
    </section>
  );
}

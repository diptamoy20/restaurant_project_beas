import { useEffect, useRef, useState } from "react";

import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import {
  resolveMarkerLocation,
  resolveOrderStatus,
} from "../../utils/trackOrder";
import { DeliveryMap } from "./DeliveryMap";
import { DeliveryStatus } from "./DeliveryStatus";
import { OrderTimeline } from "./OrderTimeline";
import { formatCurrency, RiderInfo } from "./RiderInfo";

export function TrackOrderModal({ open, order, onClose, onOrderUpdated }) {
  const orderId = order?.id ?? null;
  const { tracking, loading, error, socketState, isReconnecting } =
    useDeliveryTracking(orderId, open);
  const mapPanelRef = useRef(null);
  const [mapFocusSignal, setMapFocusSignal] = useState(0);

  const orderStatus = resolveOrderStatus(tracking, order);
  const markerLocation = resolveMarkerLocation(tracking, orderStatus);
  const destination = tracking?.customer?.address ?? null;
  const itemsSummary = tracking?.order?.itemsSummary;
  const itemCount = itemsSummary?.itemCount ?? order?.items?.length ?? 0;
  const totalQuantity =
    itemsSummary?.totalQuantity ??
    (order?.items ?? []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const paymentStatus = tracking?.order?.paymentStatus ?? order?.paymentStatus ?? "PENDING";
  const orderAmount = tracking?.order?.finalAmount ?? order?.finalAmount ?? 0;
  const paymentChipClass =
    paymentStatus === "PAID" ? "order-chip order-chip--done" : "order-chip order-chip--pending";

  const focusMap = () => {
    mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setMapFocusSignal((value) => value + 1);
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!tracking?.order?.id || !onOrderUpdated) {
      return;
    }

    onOrderUpdated(tracking.order);
  }, [
    onOrderUpdated,
    tracking?.order?.id,
    tracking?.order?.status,
    tracking?.order?.paymentStatus,
  ]);

  if (!open || !order) {
    return null;
  }

  return (
    <div className="track-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="track-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-order-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="track-modal-header">
          <div className="track-modal-header-copy">
            <p className="eyebrow">Live delivery</p>
            <h2 id="track-order-title">Track Order</h2>
            <p className="copy-muted track-modal-subtitle">
              {order.orderNumber}
              {order.restaurant?.name ? ` · ${order.restaurant.name}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="track-modal-close"
            aria-label="Close track order"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="track-modal-body">
          <div className="track-modal-layout">
            <aside className="track-modal-map-panel" ref={mapPanelRef}>
              <div className="track-modal-map">
                <DeliveryMap
                  markerLocation={markerLocation}
                  tracking={tracking}
                  destination={destination}
                  orderStatus={orderStatus}
                  focusSignal={mapFocusSignal}
                />
              </div>
              <div className="track-modal-map-actions">
                <button
                  type="button"
                  className="ghost-button track-open-maps"
                  onClick={focusMap}
                >
                  Open in Maps
                </button>
              </div>
            </aside>

            <div className="track-modal-details">
              {loading ? (
                <div className="track-modal-state">
                  <div className="track-modal-spinner" aria-hidden="true" />
                  <p className="copy-muted">Loading live tracking…</p>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="track-modal-state">
                  <div className="order-status-banner error">{error}</div>
                </div>
              ) : null}

              {!loading && !tracking && !error ? (
                <div className="track-modal-state">
                  <p className="copy-muted">Tracking is not available for this order yet.</p>
                </div>
              ) : null}

              {!loading && tracking ? (
                <div className="track-modal-details-stack">
                  <section className="track-panel">
                    <RiderInfo agent={tracking.agent} />
                  </section>

                  <section className="track-panel track-order-summary">
                    <div className="track-order-summary-main">
                      <span className="track-order-bag" aria-hidden="true">
                        <BagIcon />
                      </span>
                      <div>
                        <p className="track-order-summary-title">
                          {itemCount} Items · {totalQuantity} Qty
                        </p>
                        <span className={paymentChipClass}>{paymentStatus}</span>
                      </div>
                    </div>
                    <div className="track-order-amount">
                      <p className="track-order-amount-label">Order amount</p>
                      <p className="track-order-amount-value">
                        {formatCurrency.format(orderAmount)}
                      </p>
                    </div>
                  </section>

                  <section className="track-panel">
                    <DeliveryStatus tracking={tracking} fallbackOrder={order} />
                  </section>

                  <section className="track-panel track-panel--timeline">
                    <OrderTimeline tracking={tracking} fallbackOrder={order} />
                  </section>

                  {isReconnecting ? (
                    <p className="track-socket-banner copy-muted">Reconnecting to live updates…</p>
                  ) : socketState === "ready" || socketState === "connected" ? (
                    <p className="track-socket-banner track-socket-banner--live">
                      Live updates connected
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 10V8a5 5 0 0110 0v2M6 10h12l-1 11H7L6 10z" />
    </svg>
  );
}

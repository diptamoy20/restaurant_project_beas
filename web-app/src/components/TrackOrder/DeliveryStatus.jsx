import { getLiveStatusMessage, resolveOrderStatus } from "../../utils/trackOrder";

export function DeliveryStatus({ tracking, fallbackOrder }) {
  const orderStatus = resolveOrderStatus(tracking, fallbackOrder);
  const message = getLiveStatusMessage(orderStatus);

  return (
    <div className="track-live-status">
      <div className="track-live-status-icon" aria-hidden="true">
        <ScooterIcon />
      </div>
      <div>
        <p className="track-live-status-title">Live Status</p>
        <p className="track-live-status-copy">{message}</p>
      </div>
    </div>
  );
}

function ScooterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M9 17.5h5M6.5 15.5l2.2-5.2h4.3l2.4 5.2M12.5 10.3l1.8-3.1h3.2" />
    </svg>
  );
}

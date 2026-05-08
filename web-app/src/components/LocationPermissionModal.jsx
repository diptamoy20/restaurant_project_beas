import { useState } from "react";

export function LocationPermissionModal({
  open,
  status,
  error,
  onAllowLocation,
  onManualLocation,
  onClose,
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  if (!open) {
    return null;
  }

  const submitManualLocation = (event) => {
    event.preventDefault();
    onManualLocation({ lat, lng });
  };

  return (
    <div className="location-modal-backdrop" role="presentation">
      <section
        className="location-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-title"
      >
        <button
          type="button"
          className="location-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
        </button>
        <p className="eyebrow">Nearby delivery</p>
        <h2 id="location-title">
          Allow location access to discover nearby restaurants
        </h2>
        <p className="copy">
          We use your coordinates only to show restaurants that can deliver to
          your area.
        </p>

        {error ? (
          <div className="order-status-banner error">{error}</div>
        ) : null}

        <div className="location-modal-actions">
          <button
            type="button"
            onClick={onAllowLocation}
            disabled={status === "requesting"}
          >
            {status === "requesting" ? "Detecting..." : "Allow Location"}
          </button>
          {/* <button
            type="button"
            className="ghost-button location-secondary"
            onClick={() => setManualOpen(true)}
          >
            Choose Location Manually
          </button> */}
        </div>

        {/* {manualOpen ? (
          <form
            className="manual-location-form"
            onSubmit={submitManualLocation}
          >
            <label>
              Latitude
              <input
                value={lat}
                inputMode="decimal"
                placeholder="22.5726"
                onChange={(event) => setLat(event.target.value)}
              />
            </label>
            <label>
              Longitude
              <input
                value={lng}
                inputMode="decimal"
                placeholder="88.3639"
                onChange={(event) => setLng(event.target.value)}
              />
            </label>
            <button type="submit">Use This Location</button>
          </form>
        ) : null} */}
      </section>
    </div>
  );
}

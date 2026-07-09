import { useEffect } from 'react';

export function CrossRestaurantCartModal({
  open,
  currentRestaurantName,
  newRestaurantName,
  confirming,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !confirming) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, confirming, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="location-modal-backdrop cross-restaurant-backdrop"
      role="presentation"
      onClick={confirming ? undefined : onCancel}
    >
      <section
        className="location-modal cross-restaurant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cross-restaurant-title"
        aria-describedby="cross-restaurant-message"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="location-modal-close"
          aria-label="Close"
          onClick={onCancel}
          disabled={confirming}
        />
        <p className="eyebrow">Your cart</p>
        <h2 id="cross-restaurant-title">Start a New Order?</h2>
        <p id="cross-restaurant-message" className="copy cross-restaurant-message">
          Your cart already contains items from{' '}
          <strong>{currentRestaurantName}</strong>.
          <br />
          <br />
          To add items from <strong>{newRestaurantName}</strong>, you&apos;ll need
          to clear your current cart and start a new order.
        </p>
        <div className="location-modal-actions cross-restaurant-actions">
          <button type="button" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Updating cart…' : 'Clear Cart & Continue'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onCancel}
            disabled={confirming}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

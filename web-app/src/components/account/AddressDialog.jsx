import { useEffect } from 'react';
import { AddressForm } from './AddressForm';

export function 
AddressDialog({
  open,
  title = 'Add address',
  initialAddress,
  submitting,
  submitLabel,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('drawer-open');
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="address-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="address-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="address-dialog-header">
          <h3 id="address-dialog-title">{title}</h3>
          <button
            type="button"
            className="address-dialog-close"
            aria-label="Close address form"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <AddressForm
          initialAddress={initialAddress}
          onSubmit={onSubmit}
          onCancel={onClose}
          submitting={submitting}
          submitLabel={submitLabel}
        />
      </section>
    </div>
  );
}

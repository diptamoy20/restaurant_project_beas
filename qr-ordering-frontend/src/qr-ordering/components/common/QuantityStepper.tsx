interface QuantityStepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  minDisabled?: boolean;
}

export function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  minDisabled = false,
}: QuantityStepperProps) {
  return (
    <div className="qr-stepper" aria-label="Quantity selector">
      <button
        type="button"
        className="qr-stepper-button qr-stepper-button--muted"
        onClick={onDecrease}
        disabled={minDisabled}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <strong>{quantity}</strong>
      <button
        type="button"
        className="qr-stepper-button"
        onClick={onIncrease}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

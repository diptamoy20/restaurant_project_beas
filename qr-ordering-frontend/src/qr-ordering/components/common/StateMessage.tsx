interface StateMessageProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateMessage({ title, message, actionLabel, onAction }: StateMessageProps) {
  return (
    <section className="qr-state">
      <div className="qr-state-icon">!</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

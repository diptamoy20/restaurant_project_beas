export function RequiredMark() {
  return (
    <span className="ml-0.5 text-rose-600" aria-hidden="true">
      *
    </span>
  );
}

export function FieldLabel({
  children,
  required = false,
  inline = false,
  className = '',
}) {
  return (
    <span
      className={`${inline ? 'inline' : 'mb-2 block'} ${className}`.trim()}
    >
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  );
}

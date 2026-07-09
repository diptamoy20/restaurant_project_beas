import { FieldLabel } from './FieldLabel';

export function TextField({ label, error, required = false, className = '', ...props }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

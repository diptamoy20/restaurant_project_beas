import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FieldLabel } from './FieldLabel';

export function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  required = false,
  error,
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        String(o.label || '').toLowerCase().includes(q) ||
        String(o.sublabel || '').toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange?.(option.value);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[highlighted]) {
        handleSelect(filtered[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setQuery('');
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`block text-sm font-medium text-slate-700 ${className}`}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <input
          type="text"
          value={open ? query : (selected?.label ?? '')}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
            {filtered.map((option, idx) => (
              <li key={option.value}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                    idx === highlighted ? 'bg-emerald-50 text-emerald-900' : 'text-slate-800'
                  }`}
                >
                  <span className="truncate font-medium">{option.label}</span>
                  {option.sublabel ? (
                    <span className="shrink-0 text-xs text-slate-400">{option.sublabel}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && filtered.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-xs text-slate-500 shadow-xl">
            No matching items
          </div>
        )}
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}

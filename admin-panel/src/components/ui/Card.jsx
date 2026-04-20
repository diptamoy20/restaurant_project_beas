export function Card({ title, eyebrow, actions, children, className = '' }) {
  return (
    <section className={`rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}>
      {(title || eyebrow || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
            ) : null}
            {title ? <h2 className="text-lg font-semibold text-slate-950">{title}</h2> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}


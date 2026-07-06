function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
        clipRule="evenodd"
      />
    </svg>
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

export function TimelineItem({ label, state, isLast = false }) {
  const icon =
    state === "active" && label === "On The Way" ? <ScooterIcon /> : <CheckIcon />;

  return (
    <div className={`track-timeline-item track-timeline-item--${state}`}>
      <div className="track-timeline-rail">
        <div className="track-timeline-node">{icon}</div>
        {!isLast ? <div className="track-timeline-connector" /> : null}
      </div>
      <p className="track-timeline-label">{label}</p>
    </div>
  );
}

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getInitials(name) {
  if (!name) {
    return "R";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function RiderInfo({ agent }) {
  if (!agent) {
    return (
      <div className="track-rider track-rider--empty">
        <div className="track-rider-avatar track-rider-avatar--placeholder" />
        <div className="track-rider-copy">
          <p className="track-rider-name">Rider not assigned yet</p>
          <p className="track-rider-meta">We will notify you once a rider is on the way</p>
        </div>
      </div>
    );
  }

  const vehicleBrand = agent.vehicle?.brand ?? agent.vehicle?.vehicleType ?? "Delivery";
  const vehicleNumber = agent.vehicle?.vehicleNumber ?? "—";

  return (
    <div className="track-rider">
      {agent.profileImageUrl ? (
        <img
          className="track-rider-avatar"
          src={agent.profileImageUrl}
          alt={agent.name}
        />
      ) : (
        <div className="track-rider-avatar track-rider-avatar--initials" aria-hidden="true">
          {getInitials(agent.name)}
        </div>
      )}

      <div className="track-rider-copy">
        <p className="track-rider-name">{agent.name}</p>
        <p className="track-rider-meta">
          {vehicleBrand} • {vehicleNumber}
        </p>
      </div>

      {agent.phone ? (
        <a
          className="track-rider-call nav-cta"
          href={`tel:${agent.phone}`}
          aria-label={`Call ${agent.name}`}
        >
          <PhoneIcon />
          <span>Call</span>
        </a>
      ) : null}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
    </svg>
  );
}

export function RiderInfoSummary({ tracking }) {
  return <RiderInfo agent={tracking?.agent ?? null} />;
}

export { formatCurrency };

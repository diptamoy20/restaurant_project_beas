import logo from '../../assets/project-logo.svg';

interface BrandHeaderProps {
  title: string;
  tableName?: string;
  restaurantName?: string;
  compact?: boolean;
}

export function BrandHeader({
  title,
  tableName,
  restaurantName,
  compact = false,
}: BrandHeaderProps) {
  return (
    <header
      className={`qr-brand-header ${
        compact ? 'qr-brand-header--compact' : ''
      }`}
    >
      {/* Logo Only */}
      <div className="qr-logo" aria-label="Foodyply">
        <img
          src={logo}
          alt="Foodyply Logo"
          className="qr-logo-image"
        />
      </div>

      {/* Welcome Text */}
      <div className="qr-header-content">
        <h1>{title}</h1>

        {tableName ? (
          <p className="qr-table-number">
            Table No: {tableName}
          </p>
        ) : null}

        {restaurantName ? (
          <span className="qr-restaurant-chip">
            {restaurantName}
          </span>
        ) : null}
      </div>
    </header>
  );
}

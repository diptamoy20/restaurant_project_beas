export function LoadingSkeleton() {
  return (
    <div className="qr-shell qr-shell--loading">
      <div className="qr-skeleton qr-skeleton-hero" />
      <div className="qr-category-row">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="qr-skeleton qr-skeleton-category" key={index} />
        ))}
      </div>
      <div className="qr-food-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="qr-skeleton qr-skeleton-card" key={index} />
        ))}
      </div>
    </div>
  );
}

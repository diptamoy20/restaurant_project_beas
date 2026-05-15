import type { QRMenuItem } from '../../types/menu.types';
import { formatCurrency } from '../../utils/formatters';
import { getMenuItemImage } from '../../utils/images';

interface BestSellerStripProps {
  items: QRMenuItem[];
  onViewAll: () => void;
}

export function BestSellerStrip({ items, onViewAll }: BestSellerStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="qr-best-seller">
      <div className="qr-section-title">
        <h2>Best Seller</h2>
        <button type="button" onClick={onViewAll}>
          View All <span>›</span>
        </button>
      </div>
      <div className="qr-best-strip">
        {items.slice(0, 4).map((item) => (
          <article className="qr-best-card" key={item.id}>
            <img src={getMenuItemImage(item)} alt={item.name} />
            <span>{formatCurrency(item.price)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

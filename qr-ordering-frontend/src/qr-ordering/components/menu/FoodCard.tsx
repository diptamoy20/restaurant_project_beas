import type { QRMenuItem } from '../../types/menu.types';
import { formatCurrency } from '../../utils/formatters';
import { getMenuItemImage } from '../../utils/images';

interface FoodCardProps {
  item: QRMenuItem;
  quantity: number;
  onOpenOptions: (item: QRMenuItem) => void;
}

export function FoodCard({ item, quantity, onOpenOptions }: FoodCardProps) {
  return (
    <article className="qr-food-card">
      <div className="qr-food-image-wrap">
        <img src={getMenuItemImage(item)} alt={item.name} className="qr-food-image" />
        <button
          className={`qr-food-add ${quantity > 0 ? 'is-active' : ''}`}
          type="button"
          aria-label={`Add ${item.name}`}
          onClick={() => onOpenOptions(item)}
        >
          {quantity > 0 ? quantity : '+'}
        </button>
      </div>
      <div className="qr-food-copy">
        <h3>{item.name}</h3>
        <p>{item.description || 'Freshly prepared and served at your table.'}</p>
        <strong>{formatCurrency(item.price)}</strong>
      </div>
    </article>
  );
}

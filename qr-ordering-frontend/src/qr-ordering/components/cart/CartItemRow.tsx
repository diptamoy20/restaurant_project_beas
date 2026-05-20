import { QuantityStepper } from '../common/QuantityStepper';
import type { CartItem } from '../../types/cart.types';
import { formatCurrency, pluralize } from '../../utils/formatters';

interface CartItemRowProps {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onIncrease, onDecrease, onRemove }: CartItemRowProps) {
  return (
    <article className="qr-cart-item">
      <img src={item.image} alt={item.name} />
      <div className="qr-cart-item-body">
        <div className="qr-cart-item-main">
          <div>
            <h3>{item.name}</h3>
            <p>{item.variant ? item.variant.name : 'Regular'}</p>
            {item.addOns.length > 0 ? (
              <p className="qr-cart-addons">
                Add-ons: {item.addOns.map((addOn) => addOn.addonOptionName).join(', ')}
              </p>
            ) : null}
          </div>
          <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
        </div>
        <div className="qr-cart-item-meta">
          <span>{pluralize(item.quantity, 'item')}</span>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
        <QuantityStepper quantity={item.quantity} onIncrease={onIncrease} onDecrease={onDecrease} />
      </div>
    </article>
  );
}

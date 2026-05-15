import { useNavigate } from 'react-router-dom';

import { useCart } from '../../hooks/useCart';
import { formatCurrency, pluralize } from '../../utils/formatters';

export function StickyCartCTA() {
  const navigate = useNavigate();
  const { itemCount, total } = useCart();

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="qr-cart-cta-wrap">
      <p>Deal of the Day Unlocked!</p>
      <button className="qr-cart-cta" type="button" onClick={() => navigate('/cart')}>
        <span>Added to cart ({pluralize(itemCount, 'item')})</span>
        <strong>{formatCurrency(total)} · View Cart ›</strong>
      </button>
    </div>
  );
}

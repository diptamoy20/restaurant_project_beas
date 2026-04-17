import { useSelector } from 'react-redux';

export function CartPage() {
  const items = useSelector((state) => state.cart.items);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h2>Your order summary</h2>
        </div>
      </div>

      <div className="stack">
        {items.length === 0 ? (
          <div className="empty-state">Your cart is empty.</div>
        ) : (
          items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="line-item">
              <span>{item.name}</span>
              <strong>${item.price.toFixed(2)}</strong>
            </div>
          ))
        )}
        <div className="total-row">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>
    </section>
  );
}


import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';

export function MenuPage() {
  const items = useSelector((state) => state.menu.items);
  const dispatch = useDispatch();

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h2>Today's favorites</h2>
        </div>
      </div>

      <div className="menu-grid">
        {items.map((item) => (
          <article key={item.id} className="menu-card">
            <span className="pill">{item.category}</span>
            <h3>{item.name}</h3>
            <p>${item.price.toFixed(2)}</p>
            <button type="button" onClick={() => dispatch(addToCart(item))}>
              Add to cart
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}


import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { addToCart } from '../store/slices/cartSlice';
import { persistTableId, resolveTableId } from '../lib/tableSession';

export function MenuPage() {
  const items = useSelector((state) => state.menu.items);
  const dispatch = useDispatch();
  const location = useLocation();
  const [quantities, setQuantities] = useState({});
  const tableId = resolveTableId(location.search);

  useEffect(() => {
    if (tableId) {
      persistTableId(tableId);
    }
  }, [tableId]);

  const getQuantity = (itemId) => quantities[itemId] ?? 1;

  const updateQuantity = (itemId, nextQuantity) => {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(1, nextQuantity),
    }));
  };

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
            <div className="menu-card-actions">
              <div className="quantity-selector" aria-label={`Quantity for ${item.name}`}>
                <button
                  type="button"
                  className="quantity-button"
                  aria-label={`Decrease quantity for ${item.name}`}
                  onClick={() => updateQuantity(item.id, getQuantity(item.id) - 1)}
                >
                  -
                </button>
                <span className="quantity-value">{getQuantity(item.id)}</span>
                <button
                  type="button"
                  className="quantity-button"
                  aria-label={`Increase quantity for ${item.name}`}
                  onClick={() => updateQuantity(item.id, getQuantity(item.id) + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  dispatch(
                    addToCart({
                      item,
                      quantity: getQuantity(item.id),
                    }),
                  )
                }
              >
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, addToCartAsync } from '../store/slices/cartSlice';
import { fetchMenu } from '../store/slices/menuSlice';
import {
  persistRestaurantId,
  persistTableId,
} from '../lib/tableSession';

const HARDCODED_RESTAURANT_ID = '1';
const HARDCODED_TABLE_ID = '1';

export function MenuPage() {
  const dispatch = useDispatch();
  const { items, loading, error, restaurantId: menuRestaurantId } = useSelector((state) => state.menu);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const [quantities, setQuantities] = useState({});
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState(HARDCODED_RESTAURANT_ID);
  const tableId = HARDCODED_TABLE_ID;

  useEffect(() => {
    if (tableId) {
      persistTableId(tableId);
    }
  }, [tableId]);

  useEffect(() => {
    // Temporarily hardcoded for local testing.
    // Dynamic URL/session/table-to-restaurant resolution is intentionally disabled.
    setResolvedRestaurantId(HARDCODED_RESTAURANT_ID);
    persistRestaurantId(HARDCODED_RESTAURANT_ID);
  }, []);

  useEffect(() => {
    if (resolvedRestaurantId) {
      dispatch(fetchMenu(Number(resolvedRestaurantId)));
    }
  }, [dispatch, resolvedRestaurantId]);

  const activeRestaurantId = useMemo(
    () => menuRestaurantId ?? (resolvedRestaurantId ? Number(resolvedRestaurantId) : null),
    [menuRestaurantId, resolvedRestaurantId],
  );

  const getQuantity = (itemId) => quantities[itemId] ?? 1;

  const updateQuantity = (itemId, nextQuantity) => {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(1, nextQuantity),
    }));
  };

  const handleAddToCart = (item) => {
    const quantity = getQuantity(item.id);
    
    if (isAuthenticated) {
      // Use async API when authenticated
      dispatch(
        addToCartAsync({
          menuItemId: item.id,
          quantity,
          price: item.price,
        }),
      );
    } else {
      // Use local Redux for offline/demo mode
      dispatch(
        addToCart({
          item,
          quantity,
        }),
      );
    }
    
    // Reset quantity
    setQuantities((current) => ({
      ...current,
      [item.id]: 1,
    }));
  };

  if (!activeRestaurantId) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Restaurant not selected</h2>
            <p>Please open menu using a table QR that includes table and restaurant context.</p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Loading menu...</h2>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Error loading menu</h2>
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h2>Today's favorites</h2>
          <p>
            {tableId ? `Table ${tableId}` : 'No table selected'} - Restaurant {activeRestaurantId}
          </p>
        </div>
      </div>

      <div className="menu-grid">
        {items.map((item) => (
          <article key={item.id} className="menu-card">
            <span className="pill">{item.category?.name || 'Uncategorized'}</span>
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
                onClick={() => handleAddToCart(item)}
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


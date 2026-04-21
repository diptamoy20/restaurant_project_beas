import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenu } from '../store/slices/menuSlice';
import { addToCart } from '../store/slices/cartSlice';

export function MenuPage() {
  const dispatch = useDispatch();
  const { items, loading, error, restaurantId } = useSelector((state) => state.menu);

  useEffect(() => {
    dispatch(fetchMenu());
  }, [dispatch]);

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

  if (!items.length) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>No menu items found</h2>
            <p>Menu is currently empty for the selected restaurant.</p>
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
          {restaurantId ? <p>Restaurant ID: {restaurantId}</p> : null}
        </div>
      </div>

      <div className="menu-grid">
        {items.map((item) => (
          <article key={item.id} className="menu-card">
            <span className="pill">{item.category?.name || 'Uncategorized'}</span>
            <h3>{item.name}</h3>
            <p>Rs. {item.price}</p>
            <button type="button" onClick={() => dispatch(addToCart(item))}>
              Add to cart
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}


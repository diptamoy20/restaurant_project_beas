import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { addToCart } from '../../store/slices/cartSlice';
import { RevealSection } from './RevealSection';

export function FeaturedMenu() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.menu.items.slice(0, 4));

  return (
    <RevealSection className="content-section" id="featured-menu">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">Featured Menu</p>
          <h2>Signature dishes that spark immediate cravings.</h2>
        </div>
        <Link className="text-link" to="/menu">
          Explore full menu
        </Link>
      </div>
      <div className="featured-menu-grid">
        {items.map((item) => (
          <article key={item.id} className="featured-dish-card">
            <img loading="lazy" src={item.image} alt={item.name} className="featured-dish-image" />
            <div className="featured-dish-body">
              <div className="featured-dish-copy">
                <span className="pill">{item.category}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <div className="featured-dish-footer">
                <strong>${item.price.toFixed(2)}</strong>
                <button
                  type="button"
                  className="add-cart-inline"
                  onClick={() => dispatch(addToCart({ item, quantity: 1 }))}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </RevealSection>
  );
}

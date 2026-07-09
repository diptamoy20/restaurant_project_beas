import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RevealSection } from './RevealSection';
import { useAddToCart } from '../../hooks/useAddToCart';

const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function FeaturedMenu() {
  const items = useSelector((state) => state.menu.items.slice(0, 4));
  const { addItemToCart } = useAddToCart();

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
                <strong>{formatCurrency.format(item.price)}</strong>
                <button
                  type="button"
                  className="add-cart-inline"
                  onClick={() => addItemToCart(item, null, [], 1)}
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

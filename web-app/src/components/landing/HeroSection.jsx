import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RevealSection } from './RevealSection';
import { createTableAwarePath, resolveTableId } from '../../lib/tableSession';



export function HeroSection() {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const tableId = resolveTableId(location.search);
  const menuPath = createTableAwarePath('/menu', tableId);

  return (
    <RevealSection as="section" className="hero-section">
      <div className="hero-media" aria-hidden="true" />
      <div className="hero-overlay" />
      <div className="hero-content-shell">
        <div className="hero-content">
          <p className="eyebrow">Fresh Food, Fast Service</p>
          <h1>Restaurant Web App</h1>
          <h2>Elevate every table with instant QR ordering and a checkout flow guests love.</h2>
          <p className="copy">
            Let diners scan, browse signatures, add favorites to cart, and pay in a few
            effortless taps from any phone.
          </p>
          <div className="hero-actions">
            <Link className="cta-button cta-button-primary" to={menuPath}>
              Browse Menu
            </Link>
            <a className="cta-button cta-button-secondary" href="#featured-menu">
              View Specials
            </a>
          </div>
        </div>
        <div className="hero-spotlight glass-card">
          <p className="spotlight-label">Tonight&apos;s best sellers</p>
          <div className="spotlight-list">
            <div>
              <strong>Classic Burger</strong>
              <span>Smoky cheddar, house pickles, brioche bun</span>
            </div>
            <div>
              <strong>Farmhouse Pizza</strong>
              <span>Wood-fired crust, basil pesto, roasted vegetables</span>
            </div>
            <div>
              <strong>Cold Coffee</strong>
              <span>Silky espresso blend with cream foam</span>
            </div>
          </div>
        </div>
      </div>
      {user ? (
        <div className="hero-badge glass-card">Signed in as {user.name || user.email}</div>
      ) : null}
    </RevealSection>
  );
}

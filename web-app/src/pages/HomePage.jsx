import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function HomePage() {
  const user = useSelector((state) => state.auth.user);

  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Customer Experience</p>
        <h2>Scan, browse, order, and pay from any mobile browser.</h2>
        <p className="copy">
          This app is designed for QR-based ordering, online payment, loyalty offers,
          and order tracking without installing a native app.
        </p>
        {user ? <p className="welcome-banner">Signed in as {user.name || user.email}</p> : null}
        <Link className="cta" to="/menu">
          Browse Menu
        </Link>
      </div>
      <div className="card-grid">
        <article className="info-card">
          <h3>Fast Ordering</h3>
          <p>Table-specific QR flow for dine-in and direct checkout.</p>
        </article>
        <article className="info-card">
          <h3>Loyalty Ready</h3>
          <p>Membership, points, coupons, and rewards can plug into the same API.</p>
        </article>
        <article className="info-card">
          <h3>Responsive UI</h3>
          <p>Optimized for mobile browsers first, while still working well on desktop.</p>
        </article>
      </div>
    </section>
  );
}

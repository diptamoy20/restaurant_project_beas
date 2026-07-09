import { Link } from 'react-router-dom';
import { RevealSection } from './RevealSection';

export function CTABanner() {
  return (
    <RevealSection className="content-section">
      <div className="cta-banner">
        <div>
          <p className="eyebrow">Ready to Order?</p>
          <h2>Bring guests from table scan to paid order in a beautifully simple flow</h2>
        </div>
        <div className="hero-actions">
          <Link className="cta-button cta-button-primary" to="/menu">
            Start Ordering
          </Link>
          <a className="cta-button cta-button-secondary" href="#how-it-works">
            See How It Works
          </a>
        </div>
      </div>
    </RevealSection>
  );
}

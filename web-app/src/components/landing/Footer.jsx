export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="eyebrow">Restaurant Web App</p>
          <h3>Modern QR dining that keeps service quick and memorable.</h3>
          <p className="footer-copy">
            21 Market Street, Culinary District
            <br />
            Open daily from 11:00 AM to 11:00 PM
          </p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How It Works</a>
          <a href="/#featured-menu">Featured Menu</a>
        </div>
        <div>
          <h4>Navigate</h4>
          <a href="/menu">Browse Menu</a>
          <a href="/cart">View Cart</a>
          <a href="/login">Customer Login</a>
        </div>
        <div>
          <h4>Social</h4>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer">
            Facebook
          </a>
          <a href="https://x.com" target="_blank" rel="noreferrer">
            X
          </a>
        </div>
      </div>
    </footer>
  );
}

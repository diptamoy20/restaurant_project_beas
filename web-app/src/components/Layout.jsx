import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { CartIcon } from './landing/LandingIcons';
import { createTableAwarePath, resolveTableId } from '../lib/tableSession';
import projectLogo from '../assets/project-logo.svg';

export function Layout({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const cartItems = useSelector((state) => state.cart.items);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = location.pathname === '/';
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const tableId = resolveTableId(location.search);
  const homePath = createTableAwarePath('/', tableId);
  const menuPath = createTableAwarePath('/menu', tableId);
  const cartPath = createTableAwarePath('/cart', tableId);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', menuOpen);

    return () => document.body.classList.remove('drawer-open');
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <header
        className={[
          'topbar',
          isHomePage && !scrolled ? 'topbar-transparent' : 'topbar-solid',
        ].join(' ')}
      >
        <div className="topbar-inner">
          <Link className="brand" to={homePath}>
            {/* <span className="brand-mark">FoodyPly</span> */}
            <span className="brand-mark" aria-hidden="true">
              <img src={projectLogo} alt="" />
            </span>
            <div>
              <p className="eyebrow">QR Ordering & Payment</p>
              {/* <strong>FoodyPly</strong> */}
            </div>
          </Link>

          <nav className="nav desktop-nav">
            {user ? (
              <>
                <Link className={location.pathname === '/' ? 'active' : ''} to={homePath}>
                  Home
                </Link>
                <Link className={location.pathname === '/menu' ? 'active' : ''} to={menuPath}>
                  Menu
                </Link>
                <Link className={location.pathname === '/cart' ? 'active' : ''} to={cartPath}>
                  <span className="cart-link-icon">
                    <CartIcon />
                  </span>
                  Cart
                  {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
                </Link>
                <button type="button" className="ghost-button" onClick={() => dispatch(logout())}>
                  Logout
                </button>
              </>
            ) : (
              <Link className={location.pathname === '/login' ? 'active' : ''} to="/login">
                Login
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <div className={menuOpen ? 'drawer-backdrop is-open' : 'drawer-backdrop'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'mobile-drawer is-open' : 'mobile-drawer'}>
        <nav className="drawer-nav">
          {user ? (
            <>
              <Link className={location.pathname === '/' ? 'active' : ''} to={homePath}>
                Home
              </Link>
              <Link className={location.pathname === '/menu' ? 'active' : ''} to={menuPath}>
                Menu
              </Link>
              <Link className={location.pathname === '/cart' ? 'active' : ''} to={cartPath}>
                Cart {cartCount > 0 ? `(${cartCount})` : ''}
              </Link>
              <button type="button" className="ghost-button drawer-logout" onClick={() => dispatch(logout())}>
                Logout
              </button>
            </>
          ) : (
            <Link className={location.pathname === '/login' ? 'active' : ''} to="/login">
              Login
            </Link>
          )}
        </nav>
      </aside>
      <main className="page">{children}</main>
    </div>
  );
}

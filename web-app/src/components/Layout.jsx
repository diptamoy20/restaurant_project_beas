import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { fetchCart } from '../store/slices/cartSlice';
import { CartIcon } from './landing/LandingIcons';
import { NavbarRestaurantSearch } from './NavbarRestaurantSearch.jsx';
import { ProfileAvatar } from './ProfileAvatar.jsx';
import { signOutFromFirebase } from '../lib/firebase';
import { getUserDisplayName } from '../utils/profile';
import projectLogo from '../assets/project-logo.svg';

export function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const cartItems = useSelector((state) => state.cart.items);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef(null);
  const isHomePage = location.pathname === '/';
  const cartCount = cartItems.reduce(
    (sum, item) => sum + (item.quantity ?? 1),
    0,
  );
  const homePath = '/';
  const menuPath = '/menu';
  const cartPath = '/cart';
  const profilePath = '/profile';
  const ordersPath = '/orders';
  const userDisplayName = useMemo(() => getUserDisplayName(user), [user]);

  const handleLogout = () => {
    signOutFromFirebase();
    dispatch(logout());
    setProfileMenuOpen(false);
    navigate('/login', { replace: true });
  };

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
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (!params.has('table')) {
      return;
    }

    params.delete('table');
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (token) {
      dispatch(fetchCart());
    }
  }, [dispatch, token]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', menuOpen);

    return () => document.body.classList.remove('drawer-open');
  }, [menuOpen]);

  const content = children ?? <Outlet />;

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

          <NavbarRestaurantSearch />

          <nav className="nav desktop-nav">
            {user ? (
              <>
                <Link
                  className={location.pathname === '/' ? 'active' : ''}
                  to={homePath}
                >
                  Home
                </Link>
                <Link
                  className={location.pathname === '/menu' ? 'active' : ''}
                  to={menuPath}
                >
                  Menu
                </Link>
                <Link
                  className={location.pathname === '/orders' ? 'active' : ''}
                  to={ordersPath}
                >
                  Orders
                </Link>
                <Link
                  className={location.pathname === '/cart' ? 'active' : ''}
                  to={cartPath}
                >
                  <span className="cart-link-icon">
                    <CartIcon />
                  </span>
                  Cart
                  {cartCount > 0 ? (
                    <span className="cart-badge">{cartCount}</span>
                  ) : null}
                </Link>
                <div className="profile-menu" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={
                      profileMenuOpen
                        ? 'profile-trigger is-open'
                        : 'profile-trigger'
                    }
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    onClick={() => setProfileMenuOpen((current) => !current)}
                  >
                    <ProfileAvatar
                      user={user}
                      className="profile-avatar profile-avatar-sm"
                    />
                    <span className="profile-trigger-copy">
                      <span>{userDisplayName}</span>
                      <small>Account</small>
                    </span>
                  </button>

                  {profileMenuOpen ? (
                    <div className="profile-dropdown" role="menu">
                      <div className="profile-dropdown-header">
                        <ProfileAvatar
                          user={user}
                          className="profile-avatar profile-avatar-md"
                        />
                        <div>
                          <strong>{userDisplayName}</strong>
                          <span>
                            {user?.email || user?.phone || 'Signed in'}
                          </span>
                        </div>
                      </div>
                      <Link
                        className="profile-dropdown-action"
                        role="menuitem"
                        to={profilePath}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="profile-dropdown-action profile-dropdown-logout"
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link
                  className={
                    location.pathname === '/menu' ? 'nav-cta active' : 'nav-cta'
                  }
                  to={menuPath}
                >
                  Menu
                </Link>
                <Link
                  className={
                    location.pathname === '/login'
                      ? 'nav-cta active'
                      : 'nav-cta'
                  }
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className={
                    location.pathname === '/register'
                      ? 'nav-cta active'
                      : 'nav-cta'
                  }
                  to="/register"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className="menu-toggle"
            aria-label={
              menuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
      <div
        className={menuOpen ? 'drawer-backdrop is-open' : 'drawer-backdrop'}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={menuOpen ? 'mobile-drawer is-open' : 'mobile-drawer'}>
        <div className="drawer-restaurant-search">
          <NavbarRestaurantSearch />
        </div>
        <nav className="drawer-nav">
          {user ? (
            <>
              <div className="drawer-profile-summary">
                <ProfileAvatar
                  user={user}
                  className="profile-avatar profile-avatar-md"
                />
                <div>
                  <strong>{userDisplayName}</strong>
                  <span>{user?.email || user?.phone || 'Signed in'}</span>
                </div>
              </div>
              <Link
                className={location.pathname === '/' ? 'active' : ''}
                to={homePath}
              >
                Home
              </Link>
              <Link
                className={location.pathname === '/menu' ? 'active' : ''}
                to={menuPath}
              >
                Menu
              </Link>
              <Link
                className={location.pathname === '/orders' ? 'active' : ''}
                to={ordersPath}
              >
                Orders
              </Link>
              <Link
                className={location.pathname === '/cart' ? 'active' : ''}
                to={cartPath}
              >
                Cart {cartCount > 0 ? `(${cartCount})` : ''}
              </Link>
              <Link
                className={location.pathname === '/profile' ? 'active' : ''}
                to={profilePath}
              >
                Profile
              </Link>
              <button
                type="button"
                className="ghost-button drawer-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                className={
                  location.pathname === '/menu' ? 'nav-cta active' : 'nav-cta'
                }
                to={menuPath}
              >
                Menu
              </Link>
              <Link
                className={
                  location.pathname === '/login' ? 'nav-cta active' : 'nav-cta'
                }
                to="/login"
              >
                Login
              </Link>
              <Link
                className={
                  location.pathname === '/register'
                    ? 'nav-cta active'
                    : 'nav-cta'
                }
                to="/register"
              >
                Sign Up
              </Link>
            </>
          )}
          </nav>
        </aside>
      <main className="page">{content}</main>
    </div>
  );
}

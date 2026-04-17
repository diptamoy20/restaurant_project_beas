import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

export function Layout({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">QR Ordering & Payment</p>
          <h1>Restaurant Web App</h1>
        </div>
        <nav className="nav">
          {user ? (
            <>
              <Link className={location.pathname === '/' ? 'active' : ''} to="/">
                Home
              </Link>
              <Link className={location.pathname === '/menu' ? 'active' : ''} to="/menu">
                Menu
              </Link>
              <Link className={location.pathname === '/cart' ? 'active' : ''} to="/cart">
                Cart
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
      </header>
      <main className="page">{children}</main>
    </div>
  );
}

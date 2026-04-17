import { Link, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

export function AdminLayout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, selectedRole } = useSelector((state) => state.auth);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Admin Panel</h1>
          {user ? (
            <p className="sidebar-user">
              {user.name || user.email}
              <br />
              {selectedRole === 'manager' ? 'Manager' : 'Admin'}
            </p>
          ) : null}
        </div>
        <nav className="sidebar-nav">
          <Link className={location.pathname === '/' ? 'active' : ''} to="/">
            Dashboard
          </Link>
          <Link className={location.pathname === '/menu' ? 'active' : ''} to="/menu">
            Menu
          </Link>
          <Link className={location.pathname === '/orders' ? 'active' : ''} to="/orders">
            Orders
          </Link>
          <button type="button" className="sidebar-logout" onClick={() => dispatch(logout())}>
            Logout
          </button>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

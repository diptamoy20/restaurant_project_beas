import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { closeSidebar } from '../features/ui/uiSlice';
import { getVisibleRoutes } from '../routes/accessControl';
import { hasBackendRole, roleLabelMap } from '../utils/auth';
import projectLogo from '../assets/project-logo.svg';

function isActiveRoute(pathname, to) {
  if (to === '/restaurants') {
    if (pathname === '/restaurants') return true;
    if (!pathname.startsWith('/restaurants/')) return false;
    if (pathname.includes('/kitchen')) return false;
    return true;
  }
  if (to === '/kitchen') {
    if (pathname === '/kitchen') return true;
    if (pathname.includes('/kitchen')) return true;
    return false;
  }
  return pathname === to;
}

export function Sidebar() {
  const dispatch = useDispatch();
  const { role, permissions, user } = useSelector((state) => state.auth);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const routes = getVisibleRoutes(role, permissions);
  const isDeliveryBoy = hasBackendRole(user, 'delivery_boy');
  const { pathname } = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-950 px-5 py-6 text-white transition lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="rounded-[28px] bg-white/6 p-4">
        <div className="inline-flex h-30 w-full items-center justify-center rounded-2xl 0 p-2 shadow-lg shadow-emerald-950/35">
          <img src={projectLogo} alt="Restaurant logo" className="h-full w-full object-contain" />
        </div>
        <h1 className="mt-2 text-2xl font-semibold">
          {isDeliveryBoy ? 'Delivery Panel' : 'Admin Panel'}
        </h1>
        <p className="mt-2 text-sm text-slate-300">Signed in as {roleLabelMap[role] ?? 'User'}</p>
      </div>

      <nav className="mt-8 space-y-2">
        {routes.map((route) => {
          const active = isActiveRoute(pathname, route.path);
          return (
            <NavLink
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'bg-white/40 text-slate-950'
                  : 'text-slate-300 hover:bg-white/20 hover:text-white'
              }`}
              key={route.path}
              onClick={() => dispatch(closeSidebar())}
              to={route.path}
            >
              {route.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

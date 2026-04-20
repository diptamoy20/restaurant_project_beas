import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { closeSidebar } from '../features/ui/uiSlice';
import { getVisibleRoutes } from '../routes/accessControl';
import { roleLabelMap } from '../utils/auth';

export function Sidebar() {
  const dispatch = useDispatch();
  const { role, permissions } = useSelector((state) => state.auth);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const routes = getVisibleRoutes(role, permissions);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-950 px-5 py-6 text-white transition lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="rounded-[28px] bg-white/6 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Restaurant OS</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin Panel</h1>
        <p className="mt-2 text-sm text-slate-300">
          Signed in as {roleLabelMap[role] ?? 'User'}
        </p>
      </div>

      <nav className="mt-8 space-y-2">
        {routes.map((route) => (
          <NavLink
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`
            }
            key={route.path}
            onClick={() => dispatch(closeSidebar())}
            to={route.path}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}


import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../app/store';

function NavSection({ title, children }) {
  return (
    <div className="mb-4">
      <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {children}
    </div>
  );
}

export function Sidebar() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const user = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();

  const role = user?.role || 'STORE_MANAGER';

  const masterLinks = [
    { label: 'Suppliers', path: '/suppliers', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'PROCUREMENT_MANAGER', 'PURCHASE_OFFICER'] },
    { label: 'Ingredients', path: '/ingredients', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'STORE_MANAGER', 'AUDITOR'] },
    { label: 'Categories', path: '/categories', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
    // { label: 'Units', path: '/units', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
    // { label: 'Brands', path: '/brands', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
    // { label: 'Taxes', path: '/taxes', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
    { label: 'Recipes (BOM)', path: '/recipes', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'STORE_MANAGER'] },
  ];

  const warehouseLinks = [
    { label: 'Warehouse', path: '/warehouse', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER', 'PROCUREMENT_MANAGER', 'PURCHASE_OFFICER', 'GOODS_RECEIVING_OFFICER', 'AUDITOR'] },
  ];

  const branchLinks = [
    { label: 'Restaurants', path: '/restaurants', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'STORE_MANAGER', 'AUDITOR'] },
  ];

  const systemLinks = [
    { label: 'User Management', path: '/users', roles: ['SUPER_ADMIN'] },
    { label: 'Settings', path: '/settings', roles: ['SUPER_ADMIN', 'INVENTORY_MANAGER'] },
  ];

  const isWarehouseRoute = pathname.startsWith('/warehouse');
  const isRestaurantRoute = pathname.startsWith('/operations');

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-slate-800 bg-slate-950 px-5 py-6 text-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="rounded-[28px] bg-white/5 p-4 mb-6">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wide">
          Inventory Management System
        </h1>
        {/* <p className="text-xs text-slate-400 font-semibold uppercase tracking-[0.2em] mt-1">
          Supply Chain Platform
        </p> */}
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="text-sm font-semibold text-white">{user?.name || 'ERP Admin'}</p>
          <p className="text-xs text-slate-400 font-medium">{role.replace('_', ' ')}</p>
        </div>
      </div>

      <nav className="space-y-1">
        <NavSection title="Overview">
          <NavLink
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                isActive && pathname === '/'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
            to="/"
            end
            onClick={() => dispatch(toggleSidebar())}
          >
            Dashboard
          </NavLink>
        </NavSection>

        <NavSection title="Master Data">
          {masterLinks
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
                key={item.path}
                to={item.path}
                onClick={() => dispatch(toggleSidebar())}
              >
                {item.label}
              </NavLink>
            ))}
        </NavSection>

        <NavSection title="Warehouse Operations">
          {warehouseLinks
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <NavLink
                className={`block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  isWarehouseRoute
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={item.path}
                to={item.path}
                onClick={() => dispatch(toggleSidebar())}
              >
                {item.label}
              </NavLink>
            ))}
        </NavSection>

        <NavSection title="Branch Operations">
          {branchLinks
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <NavLink
                className={`block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  isRestaurantRoute
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={item.path}
                to={item.path}
                onClick={() => dispatch(toggleSidebar())}
              >
                {item.label}
              </NavLink>
            ))}
        </NavSection>

        <NavSection title="System">
          {systemLinks
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
                key={item.path}
                to={item.path}
                onClick={() => dispatch(toggleSidebar())}
              >
                {item.label}
              </NavLink>
            ))}
        </NavSection>
      </nav>
    </aside>
  );
}

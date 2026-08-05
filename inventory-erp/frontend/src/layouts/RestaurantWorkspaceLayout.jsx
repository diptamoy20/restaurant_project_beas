import React from 'react';
import { NavLink, Outlet, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const workspaceNavItems = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Store Inventory', path: 'store-inventory' },
  { label: 'Kitchen Inventory', path: 'kitchen-inventory' },
  { label: 'Kitchen Requests', path: 'kitchen-requests' },
  { label: 'Kitchen Transfers', path: 'kitchen-transfers' },
  { label: 'Store Requests', path: 'store-requests' },
  { label: 'Consumption', path: 'consumption' },
  { label: 'Waste', path: 'waste' },
  { label: 'Reports', path: 'reports' },
];

export function RestaurantWorkspaceLayout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const restaurant = useSelector((state) => state.restaurant);
  const basePath = `/operations/${slug}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏪</span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {restaurant.restaurantName || slug}
            </h2>
            <p className="text-xs text-slate-500">Restaurant Workspace</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/restaurants')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Switch Restaurant
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1">
        {workspaceNavItems.map((item) => {
          const to = `${basePath}/${item.path}`;
          return (
            <NavLink
              key={item.path}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

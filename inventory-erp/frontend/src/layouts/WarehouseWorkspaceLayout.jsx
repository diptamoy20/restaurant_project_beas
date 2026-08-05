import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const workspaceNavItems = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Inventory', path: 'inventory' },
  { label: 'Purchase Orders', path: 'purchase-orders' },
  { label: 'Goods Receipt (GRN)', path: 'grn' },
  { label: 'Store Requests', path: 'store-requests' },
  { label: 'Outbound Transfers', path: 'outbound-transfers' },
  { label: 'Reports', path: 'reports' },
  { label: 'Returns', path: 'returns' },
  { label: 'Stock Ledger', path: 'stock-ledger' },
];

export function WarehouseWorkspaceLayout() {
  const navigate = useNavigate();
  const warehouse = useSelector((state) => state.warehouse);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">📦</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Warehouse</p>
            <h2 className="text-sm font-bold text-slate-900">
              {warehouse.warehouseName || 'Main Warehouse'}
            </h2>
          </div>
        </div>
        <button
          onClick={() => navigate('/warehouse')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Back to Overview
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1">
        {workspaceNavItems.map((item) => {
          const to = `/warehouse/${item.path}`;
          return (
            <NavLink
              key={item.path}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm'
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

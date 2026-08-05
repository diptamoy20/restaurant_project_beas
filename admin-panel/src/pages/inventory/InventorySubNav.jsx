import { NavLink } from 'react-router-dom';

export function InventorySubNav() {
  const navItems = [
    { path: '/inventory', label: 'Dashboard', exact: true },
    { path: '/inventory/store', label: 'Store Inventory' },
    { path: '/inventory/kitchen', label: 'Kitchen Inventory' },
    { path: '/inventory/transfers', label: 'Kitchen Transfers' },
    { path: '/inventory/recipes', label: 'Recipes (BOM)' },
    { path: '/inventory/consumption', label: 'Consumption History' },
    { path: '/inventory/requisitions', label: 'Requisitions' },
    { path: '/inventory/material-return', label: 'Material Return' },
    { path: '/inventory/reports', label: 'Reports' },
  ];

  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
      <nav className="-mb-px flex space-x-2 overflow-x-auto scrollbar-none py-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

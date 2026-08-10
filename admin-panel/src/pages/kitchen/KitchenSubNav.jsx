import { NavLink, useParams } from 'react-router-dom';

export function KitchenSubNav() {
  const { restaurantSlug } = useParams();
  const base = `/restaurants/${restaurantSlug}/kitchen`;

  const navItems = [
    { path: `${base}/dashboard`, label: 'Dashboard', end: true },
    { path: `${base}/inventory`, label: 'Kitchen Cost Center' },
    { path: `${base}/requests`, label: 'Kitchen Requests' },
    { path: `${base}/consumption`, label: 'Consumption History' },
    { path: `${base}/display`, label: 'Kitchen Display' },
  ];

  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
      <nav className="-mb-px flex space-x-2 overflow-x-auto scrollbar-none py-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
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

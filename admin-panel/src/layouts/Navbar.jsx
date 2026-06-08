import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { logout } from '../features/auth/authSlice';
import { toggleSidebar } from '../features/ui/uiSlice';
import { Button } from '../components/ui/Button';
import { getInitials, roleLabelMap } from '../utils/auth';

export function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, role } = useSelector((state) => state.auth);

  const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.email, user?.name]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[#f7f4ed]/85 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
          type="button"
        >
          <span className="sr-only">Toggle sidebar</span>
          <span className="text-lg">=</span>
        </button>
        <div>
          {/* <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Operations</p> */}
          <h2 className="text-lg font-semibold text-slate-950">Restaurant Admin Workspace</h2>
        </div>
      </div>

      <div className="relative">
        <button
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-sm font-semibold text-amber-800">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-slate-900">{user?.name ?? 'Team Member'}</span>
            <span className="block text-xs text-slate-500">{roleLabelMap[role] ?? 'User'}</span>
          </span>
        </button>

        {open ? (
          <div className="absolute right-0 mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
            <p className="mt-1 text-xs text-slate-500">Manage your current admin session.</p>
            <Button className="mt-4 w-full" onClick={handleLogout} variant="secondary">
              Logout
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}


import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, toggleSidebar } from '../app/store';
import { Button } from '../components/ui/Button';

export function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(false);

  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[#f7f4ed]/85 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
          type="button"
        >
          <span className="text-lg font-bold">=</span>
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Inventory Control Panel</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            onClick={() => setOpenDropdown(!openDropdown)}
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-800">
              {getInitials(user?.name || 'ERP')}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-slate-900">{user?.name || 'ERP User'}</span>
              <span className="block text-xs text-slate-500">{user?.role?.replace('_', ' ') || 'Role'}</span>
            </span>
          </button>

          {openDropdown ? (
            <div className="absolute right-0 mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-4 shadow-xl">
              <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
              <p className="mt-1 text-xs text-slate-500">Manage your ERP session.</p>
              <Button className="mt-4 w-full" onClick={handleLogout} variant="secondary">
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f7f4ed] text-slate-900">
      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[18rem_1fr]">
        <Sidebar />
        <div className="min-w-0">
          <Navbar />
          <main className="space-y-6 px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

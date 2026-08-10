import React from 'react';
import { Card } from '../components/ui/Card';
import { useSelector } from 'react-redux';

export function SettingsPage() {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">System configuration and integration settings for the Inventory ERP.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="System Information" eyebrow="ERP Configuration">
          <div className="mt-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">System</span>
              <span className="font-semibold text-slate-900">Inventory Management ERP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Version</span>
              <span className="font-semibold text-slate-900">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Backend Port</span>
              <span className="font-semibold text-slate-900">4001</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Frontend Port</span>
              <span className="font-semibold text-slate-900">5176</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Database Schema</span>
              <span className="font-semibold text-slate-900">inventory_management</span>
            </div>
          </div>
        </Card>

        <Card title="Integration Settings" eyebrow="Restaurant App">
          <div className="mt-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Auth Method</span>
              <span className="font-mono text-xs text-slate-700">JWT Bearer Token</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Restaurant Backend</span>
              <span className="font-semibold text-slate-900">http://localhost:4000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Restaurant Admin</span>
              <span className="font-semibold text-slate-900">http://localhost:5174</span>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                The Restaurant App communicates with this ERP via secure REST APIs authenticated with JWT Bearer tokens.
                Service accounts are used for server-to-server communication.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Current Session" eyebrow="Logged In User">
          <div className="mt-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Name</span>
              <span className="font-semibold text-slate-900">{user?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Email</span>
              <span className="font-semibold text-slate-900">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Role</span>
              <span className="font-semibold text-slate-900">{user?.role?.replace('_', ' ') || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <Card title="Port Configuration" eyebrow="Service Ports">
          <div className="mt-3 space-y-3">
            {[
              { name: 'Restaurant Backend', port: '4000' },
              { name: 'Restaurant Admin Panel', port: '5174' },
              { name: 'Inventory ERP Backend', port: '4001' },
              { name: 'Inventory ERP Frontend', port: '5176' },
            ].map((svc) => (
              <div key={svc.name} className="flex justify-between text-sm">
                <span className="text-slate-500">{svc.name}</span>
                <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{svc.port}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import { useCreateUserMutation, useUpdatePermissionsMutation } from '../services/userApi';

const permissionModules = ['dashboard', 'orders', 'menu', 'categories', 'customers', 'payments', 'staff'];

export function StaffPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'manager',
    permissions: {
      dashboard: ['view'],
      orders: ['view', 'accept', 'reject'],
    },
  });
  const [createUser, createState] = useCreateUserMutation();
  const [updatePermissions, updateState] = useUpdatePermissionsMutation();

  const togglePermission = (module) => {
    setForm((current) => {
      const hasPermission = current.permissions[module]?.includes('view');
      return {
        ...current,
        permissions: {
          ...current.permissions,
          [module]: hasPermission ? [] : ['view'],
        },
      };
    });
  };

  const saveStaffMember = async (event) => {
    event.preventDefault();
    await createUser(form);
    setUsers((current) => [
      {
        id: current.length + 1,
        email: form.email,
        role: form.role,
        permissions: Object.keys(form.permissions).filter((key) => form.permissions[key]?.length),
      },
      ...current,
    ]);
  };

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error;

  return (
    <div className="space-y-6">
      <Card eyebrow="Admin Only" title="Staff & role management">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveStaffMember}>
          <TextField label="Email" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} value={form.email} />
          <TextField
            label="Password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            type="password"
            value={form.password}
          />
          <TextField label="Role" onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} value={form.role} />

          <div className="md:col-span-2">
            <p className="mb-3 text-sm font-medium text-slate-700">Permissions</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {permissionModules.map((module) => {
                const active = form.permissions[module]?.includes('view');
                return (
                  <label
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${active ? 'border-slate-900 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                    key={module}
                  >
                    <input checked={active} onChange={() => togglePermission(module)} type="checkbox" />
                    <span className="capitalize">{module}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 flex gap-3">
            <Button disabled={createState.isLoading} type="submit">
              Create user
            </Button>
            <Button
              onClick={() => updatePermissions({ email: form.email, permissions: form.permissions })}
              type="button"
              variant="secondary"
            >
              Save permissions
            </Button>
          </div>
        </form>

        {mutationError ? (
          <div className="mt-4">
            <ErrorState
              message={`${mutationError} The UI is ready, but the current backend does not yet expose staff management endpoints.`}
            />
          </div>
        ) : null}
      </Card>

      <Card eyebrow="Preview" title="Configured staff records">
        <Table
          columns={[
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role' },
            {
              key: 'permissions',
              header: 'Permissions',
              render: (row) => row.permissions.join(', ') || 'No access',
            },
          ]}
          data={users}
          emptyMessage="Created staff members will be staged here once you submit the form."
        />
      </Card>
    </div>
  );
}


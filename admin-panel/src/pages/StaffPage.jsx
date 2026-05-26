import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Loader } from '../components/ui/Loader';
import { SelectField } from '../components/ui/SelectField';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';
import {
  useCreateUserMutation,
  useGetUsersQuery,
  useUpdatePermissionsMutation,
} from '../services/userApi';

const permissionModules = [
  'dashboard',
  'orders',
  'restaurants',
  'categories',
  'customers',
  'payments',
  'staff',
  'deliveries',
];

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'delivery_boy', label: 'Delivery boy' },
  { value: 'admin', label: 'Admin' },
];

export function StaffPage() {
  const { data: users = [], isLoading, error: listError } = useGetUsersQuery();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
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
    await createUser(form).unwrap();
    setForm((current) => ({
      ...current,
      name: '',
      email: '',
      phone: '',
      password: '',
    }));
  };

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error;

  return (
    <div className="space-y-6">
      <Card eyebrow="Admin Only" title="Staff & delivery boys">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveStaffMember}>
          <TextField
            label="Name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            value={form.name}
          />
          <TextField
            label="Email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            value={form.email}
          />
          <TextField
            label="Phone"
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            value={form.phone}
          />
          <TextField
            label="Password"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            type="password"
            value={form.password}
          />
          <SelectField
            label="Role"
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            options={roleOptions}
            value={form.role}
          />

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
                    <input
                      checked={active}
                      onChange={() => togglePermission(module)}
                      type="checkbox"
                    />
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
              disabled={!form.email}
              onClick={() => {
                const user = users.find((item) => item.email === form.email);
                if (user) {
                  updatePermissions({
                    id: user.id,
                    email: form.email,
                    permissions: form.permissions,
                  });
                }
              }}
              type="button"
              variant="secondary"
            >
              Save permissions
            </Button>
          </div>
        </form>

        {mutationError ? (
          <div className="mt-4">
            <ErrorState message={mutationError} />
          </div>
        ) : null}
      </Card>

      <Card eyebrow="Live" title="Configured staff records">
        {isLoading ? <Loader label="Loading staff..." /> : null}
        {listError ? (
          <ErrorState
            message={listError?.data?.message || listError?.error || 'Unable to load staff.'}
          />
        ) : null}
        {!isLoading && !listError ? (
          <Table
            columns={[
              {
                key: 'email',
                header: 'Email',
                render: (row) => row.email || row.phone,
              },
              {
                key: 'roles',
                header: 'Role',
                render: (row) => (row.roles || []).join(', '),
              },
              {
                key: 'deliveryAgent',
                header: 'Delivery profile',
                render: (row) =>
                  row.deliveryAgent
                    ? `${row.deliveryAgent.name} (${row.deliveryAgent.phone})`
                    : 'Not linked',
              },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (row) =>
                  Object.keys(row.permissions || {})
                    .filter((key) => row.permissions[key]?.length)
                    .join(', ') || 'No access',
              },
            ]}
            data={users}
            emptyMessage="No staff users created yet."
          />
        ) : null}
      </Card>
    </div>
  );
}

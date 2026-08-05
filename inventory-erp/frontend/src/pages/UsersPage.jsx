import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/TextField';
import { SelectField } from '../components/ui/SelectField';

const ROLES = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Inventory Manager', value: 'INVENTORY_MANAGER' },
  { label: 'Warehouse Manager', value: 'WAREHOUSE_MANAGER' },
  { label: 'Procurement Manager', value: 'PROCUREMENT_MANAGER' },
  { label: 'Purchase Officer', value: 'PURCHASE_OFFICER' },
  { label: 'Goods Receiving Officer', value: 'GOODS_RECEIVING_OFFICER' },
  { label: 'Store Manager', value: 'STORE_MANAGER' },
  { label: 'Auditor', value: 'AUDITOR' },
];

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STORE_MANAGER');
  const [submitError, setSubmitError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('users');
      setUsers(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await apiFetch('users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('STORE_MANAGER');
      fetchUsers();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create user.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  if (loading && users.length === 0) return <Loader label="Loading user management..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role', render: (row) => (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
        {row.role?.replace('_', ' ')}
      </span>
    )},
    { header: 'Status', key: 'isActive', render: (row) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { header: 'Created', key: 'createdAt', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => handleDelete(row.id)}>
        Delete
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Manage ERP users and their role-based access permissions.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Add New User</Button>
      </div>

      <Card title="ERP Users" eyebrow="Role-Based Access">
        <Table columns={columns} data={users} emptyMessage="No users found. Create the first user." />
      </Card>

      <Modal open={modalOpen} title="Create New ERP User" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" required />
          <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@erp.com" required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
          <SelectField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLES}
            required
          />
          {submitError ? <ErrorState error={submitError} /> : null}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

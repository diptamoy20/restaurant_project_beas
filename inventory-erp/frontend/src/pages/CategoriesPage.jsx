import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { TextField } from '../components/ui/TextField';

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [submitError, setSubmitError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('master/categories');
      setCategories(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!newCatName.trim()) return;

    try {
      await apiFetch('master/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create category.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiFetch(`master/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete category.');
    }
  };

  if (loading && categories.length === 0) return <Loader label="Loading inventory categories..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Category Name', key: 'name' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <Button variant="danger" className="py-1 px-3 text-xs" onClick={() => handleDelete(row.id)}>
        Delete
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Categories</h1>
        <p className="text-sm text-slate-500">Manage categories to organize ingredient stocks.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card title="Inventory Categories List" eyebrow="Categories">
          <Table columns={columns} data={categories} emptyMessage="No categories created yet." />
        </Card>

        <Card title="Add Category" eyebrow="Quick Create">
          <form onSubmit={handleCreate} className="space-y-4">
            <TextField
              label="Category Name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Seafood"
              required
            />
            {submitError ? <ErrorState error={submitError} /> : null}
            <Button type="submit" className="w-full">Create Category</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

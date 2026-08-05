import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { TextField } from '../components/ui/TextField';

export function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('master/brands');
      setBrands(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await apiFetch('master/brands', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      setName('');
      await fetchBrands();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand?')) return;
    try {
      await apiFetch(`master/brands/${id}`, { method: 'DELETE' });
      await fetchBrands();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Loader label="Loading brands..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Brands</h1>

      <Card title="Add Brand">
        <div className="flex gap-3 mt-2">
          <TextField label="Brand Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tata, Britannia" />
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? 'Adding...' : 'Add Brand'}
          </Button>
        </div>
      </Card>

      <Card title="All Brands" eyebrow={`${brands.length} total`}>
        {brands.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No brands found.</p>
        ) : (
          <div className="space-y-2">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-900">{b.name}</span>
                <button onClick={() => handleDelete(b.id)} className="text-xs text-rose-500 hover:text-rose-700">Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

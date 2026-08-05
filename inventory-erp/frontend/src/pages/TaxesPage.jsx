import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { TextField } from '../components/ui/TextField';

export function TaxesPage() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('master/taxes');
      setTaxes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTaxes(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !rate) return;
    try {
      setSaving(true);
      await apiFetch('master/taxes', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), rate: parseFloat(rate) }),
      });
      setName('');
      setRate('');
      await fetchTaxes();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tax?')) return;
    try {
      await apiFetch(`master/taxes/${id}`, { method: 'DELETE' });
      await fetchTaxes();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <Loader label="Loading taxes..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Taxes</h1>

      <Card title="Add Tax">
        <div className="flex gap-3 mt-2">
          <TextField label="Tax Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GST, SGST" />
          <TextField label="Rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 5, 12, 18" type="number" />
          <Button onClick={handleCreate} disabled={saving || !name.trim() || !rate}>
            {saving ? 'Adding...' : 'Add Tax'}
          </Button>
        </div>
      </Card>

      <Card title="All Taxes" eyebrow={`${taxes.length} total`}>
        {taxes.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No taxes found.</p>
        ) : (
          <div className="space-y-2">
            {taxes.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium text-slate-900">{t.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{t.rate}%</span>
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-xs text-rose-500 hover:text-rose-700">Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

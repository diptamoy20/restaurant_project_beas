import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { TextField } from '../components/ui/TextField';
import { setCredentials } from '../app/store';
import { apiFetch } from '../utils/api';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({
    email: 'admin@erp.com',
    password: 'admin123',
  });

  const handleChange = (event) => {
    setFormError('');
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await apiFetch('auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      dispatch(setCredentials(response));
      navigate('/', { replace: true });
    } catch (apiError) {
      setFormError(apiError?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setFormError('');
    setSuccessMsg('');
    try {
      const response = await apiFetch('auth/seed', { method: 'POST' });
      setSuccessMsg(`Database seeded! Login with: ${response.email} / ${response.password}`);
      setForm({ email: response.email, password: response.password });
    } catch (err) {
      setFormError(err.message || 'Seeding failed. Super admin might already exist.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 overflow-hidden rounded-[36px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:flex flex-col items-center justify-center">
          <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-center">
            <h1 className="text-3xl font-extrabold text-emerald-400 tracking-wide">
              Inventory Management System
            </h1>
            {/* <p className="text-xs text-slate-400 font-semibold uppercase tracking-[0.3em] mt-1">
              Standalone Management Suite
            </p> */}
          </div>
          <p className="mt-8 max-w-xs text-center text-sm text-slate-400 leading-relaxed">
            Manage procurement, warehouses, store transfers, recipe BOMs, and kitchen consumptions in one place.
          </p>
        </div>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            ERP Access
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your Inventory ERP credentials. Role determines access permissions.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              onChange={handleChange}
              placeholder="admin@erp.com"
              required
              type="email"
              value={form.email}
            />
            <TextField
              label="Password"
              name="password"
              onChange={handleChange}
              placeholder="••••••••"
              required
              type="password"
              value={form.password}
            />

            {formError ? <ErrorState error={formError} /> : null}
            {successMsg ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-700">
                {successMsg}
              </div>
            ) : null}

            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-500">First time setting up the system?</p>
            <button
              onClick={handleSeed}
              type="button"
              className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-500 underline"
            >
              Seed Initial Super Admin Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

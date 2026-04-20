import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { SelectField } from '../components/ui/SelectField';
import { TextField } from '../components/ui/TextField';
import { setCredentials } from '../features/auth/authSlice';
import { useLoginMutation } from '../services/authApi';
import { inferUiRole, normalizePermissions, roleApiMap } from '../utils/auth';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();
  const [form, setForm] = useState({
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
  });

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await login({
      email: form.email,
      password: form.password,
      role: roleApiMap[form.role] ?? form.role,
    }).unwrap();

    const authResponse = response?.data ?? response;
    const userRoles = authResponse.user?.roles?.length ? authResponse.user.roles : [form.role];
    const role = inferUiRole(userRoles);

    dispatch(
      setCredentials({
        user: authResponse.user,
        token: authResponse.accessToken,
        role,
        permissions: normalizePermissions(authResponse.user?.permissions, role),
      }),
    );

    navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 overflow-hidden rounded-[36px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Restaurant OS</p>
          <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">
            Keep service, menu, and staff decisions in one calm workspace.
          </h1>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            <p>Role-aware navigation</p>
            <p>RTK Query API orchestration</p>
            <p>Responsive panels for live operations</p>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admin Login</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your existing role-based credentials to access the admin panel.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              onChange={handleChange}
              placeholder="admin@example.com"
              type="email"
              value={form.email}
            />
            <TextField
              label="Password"
              name="password"
              onChange={handleChange}
              placeholder="password123"
              type="password"
              value={form.password}
            />
            <SelectField label="Role" name="role" onChange={handleChange} options={roleOptions} value={form.role} />

            {error ? (
              <ErrorState
                message={error?.data?.message || error?.error || 'Unable to sign in with those credentials.'}
              />
            ) : null}

            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


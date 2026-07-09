import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import projectLogo from '../assets/project-logo.svg';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { TextField } from '../components/ui/TextField';
import { setCredentials } from '../features/auth/authSlice';
import { useLoginMutation } from '../services/authApi';
import { inferUiRole, normalizePermissions } from '../utils/auth';

const ALLOWED_ADMIN_ROLES = new Set(['admin', 'manager', 'delivery_boy']);

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    identifier: 'admin@example.com',
    password: 'password123',
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

    const identifier = form.identifier.trim();
    const credentials = identifier.includes('@')
      ? { email: identifier.toLowerCase(), password: form.password }
      : { phone: identifier, password: form.password };

    try {
      const response = await login(credentials).unwrap();

      const authResponse = response?.data ?? response;
      const userRole = authResponse.user?.role;

      const hasAdminAccess = ALLOWED_ADMIN_ROLES.has(userRole);

      if (!hasAdminAccess) {
        setFormError('Account is not authorized for admin portal.');
        return;
      }

      const role = inferUiRole(userRole);

      dispatch(
        setCredentials({
          user: authResponse.user,
          token: authResponse.accessToken,
          role,
          permissions: normalizePermissions(authResponse.user?.permissions, role),
        }),
      );

      navigate(location.state?.from?.pathname ?? '/dashboard', {
        replace: true,
      });
    } catch (apiError) {
      const message =
        apiError?.data?.message || apiError?.error || 'Unable to sign in with those credentials.';
      setFormError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 overflow-hidden rounded-[36px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:flex flex-col items-center justify-center">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Restaurant OS</p> */}
          <span className="brand-mark" aria-hidden="true">
            <img src={projectLogo} alt="" />
          </span>
          {/* <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">
            Keep service, menu, and staff decisions in one calm workspace.
          </h1> */}
        </div>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Admin Login
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your credentials. Role is detected automatically from your account.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <TextField
              label="Email or phone"
              name="identifier"
              onChange={handleChange}
              placeholder="admin@example.com or +919900000005"
              required
              type="text"
              value={form.identifier}
            />
            <TextField
              label="Password"
              name="password"
              onChange={handleChange}
              placeholder="password123"
              required
              type="password"
              value={form.password}
            />

            {formError || error ? (
              <ErrorState
                message={
                  formError ||
                  error?.data?.message ||
                  error?.error ||
                  'Unable to sign in with those credentials.'
                }
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

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginAdminUser } from '../store/slices/authSlice';

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
];

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
  });

  if (token) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(loginAdminUser(form));

    if (loginAdminUser.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Admin Authentication</p>
        <h2>Sign in as admin or manager</h2>
        <p className="auth-note">
          Admin and manager both authenticate directly against matching backend roles.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Role
            <select name="role" value={form.role} onChange={handleChange}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginCustomer } from '../store/slices/authSlice';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    email: 'customer@example.com',
    password: 'password123',
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
    const result = await dispatch(loginCustomer(form));

    if (loginCustomer.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Customer Login</p>
        <h2>Sign in to order, pay, and track</h2>
        <p className="copy">
          The web app does not use role selection. Customers sign in directly and
          continue with menu browsing and ordering.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="customer@example.com"
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

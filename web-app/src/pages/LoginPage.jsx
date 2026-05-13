import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  clearAuthFeedback,
  loginWithFirebaseFacebook,
  loginCustomer,
  loginWithFirebaseGoogle,
} from '../store/slices/authSlice';

function validateLoginForm(form) {
  const nextErrors = {};

  if (!form.email.trim()) {
    nextErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    nextErrors.email = 'Enter a valid email address';
  }

  if (!form.password) {
    nextErrors.password = 'Password is required';
  } else if (form.password.length < 6) {
    nextErrors.password = 'Password must be at least 6 characters';
  }

  return nextErrors;
}

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  if (token) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    dispatch(clearAuthFeedback());
    setFormErrors((current) => ({ ...current, [name]: null }));
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLoginForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    const result = await dispatch(loginCustomer(form));

    if (loginCustomer.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    dispatch(clearAuthFeedback());
    const result = await dispatch(
      loginWithFirebaseGoogle({ rememberMe: form.rememberMe }),
    );

    if (loginWithFirebaseGoogle.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  const handleFacebookLogin = async () => {
    dispatch(clearAuthFeedback());
    const result = await dispatch(
      loginWithFirebaseFacebook({ rememberMe: form.rememberMe }),
    );

    if (loginWithFirebaseFacebook.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true });
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Customer Login</p>
        <h2>Welcome back</h2>
        <p className="copy">
          Sign in to continue with ordering, payment, and order tracking.
        </p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input
              autoComplete="email"
              aria-invalid={Boolean(formErrors.email)}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="customer@example.com"
            />
            {formErrors.email ? (
              <span className="field-error">{formErrors.email}</span>
            ) : null}
          </label>
          <div className="auth-field-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrap">
              <input
                autoComplete="current-password"
                aria-invalid={Boolean(formErrors.password)}
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {formErrors.password ? (
              <span className="field-error">{formErrors.password}</span>
            ) : null}
          </div>
          <div className="auth-form-row">
            <label className="checkbox-label">
              <input
                checked={form.rememberMe}
                name="rememberMe"
                type="checkbox"
                onChange={handleChange}
              />
              Remember me
            </label>
            <Link className="text-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <div className="auth-divider" aria-hidden="true">
            <span />
            <strong>or</strong>
            <span />
          </div>
          <button
            type="button"
            className="social-login-button"
            disabled={loading}
            onClick={handleGoogleLogin}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
          <button
            type="button"
            className="social-login-button facebook-login-button"
            disabled={loading}
            onClick={handleFacebookLogin}
          >
            <span className="facebook-mark" aria-hidden="true">
              f
            </span>
            {loading ? 'Connecting...' : 'Continue with Facebook'}
          </button>
          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

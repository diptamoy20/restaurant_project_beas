import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  clearAuthFeedback,
  loginWithFirebaseFacebook,
  loginWithFirebaseGoogle,
  registerCustomer,
} from '../store/slices/authSlice';

function validateRegisterForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!form.phone.trim()) {
    errors.phone = 'Phone is required';
  } else if (!/^\+?[1-9]\d{7,14}$/.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }

  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, loading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    rememberMe: true,
  });

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
    const nextErrors = validateRegisterForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    const result = await dispatch(registerCustomer(form));

    if (registerCustomer.fulfilled.match(result)) {
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
      <div className="auth-card auth-card-wide">
        <p className="eyebrow">Create Account</p>
        <h2>Start ordering faster</h2>
        <p className="copy">
          Create a customer account for saved details and smoother checkout.
        </p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            Name
            <input
              autoComplete="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
            />
            {formErrors.name ? (
              <span className="field-error">{formErrors.name}</span>
            ) : null}
          </label>
          <div className="auth-form-grid">
            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
              {formErrors.email ? (
                <span className="field-error">{formErrors.email}</span>
              ) : null}
            </label>
            <label>
              Phone
              <input
                autoComplete="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+919911112222"
              />
              {formErrors.phone ? (
                <span className="field-error">{formErrors.phone}</span>
              ) : null}
            </label>
          </div>
          <div className="auth-form-grid">
            <div className="auth-field-group">
              <label htmlFor="register-password">Password</label>
              <div className="password-input-wrap">
                <input
                  autoComplete="new-password"
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
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
            <div className="auth-field-group">
              <label htmlFor="register-confirm-password">
                Confirm Password
              </label>
              <div className="password-input-wrap">
                <input
                  autoComplete="new-password"
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {formErrors.confirmPassword ? (
                <span className="field-error">
                  {formErrors.confirmPassword}
                </span>
              ) : null}
            </div>
          </div>
          <label className="checkbox-label">
            <input
              checked={form.rememberMe}
              name="rememberMe"
              type="checkbox"
              onChange={handleChange}
            />
            Remember me
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
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
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { clearAuthFeedback, resetPassword } from '../store/slices/authSlice';

export function ResetPasswordPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    token: searchParams.get('token') ?? '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    dispatch(clearAuthFeedback());
    setFormErrors((current) => ({ ...current, [name]: null }));
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};

    if (!form.token.trim()) {
      errors.token = 'Reset token is required';
    }

    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    dispatch(resetPassword({ token: form.token.trim(), password: form.password }));
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">New Password</p>
        <h2>Choose a new password</h2>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            Reset token
            <input
              name="token"
              value={form.token}
              onChange={handleChange}
              placeholder="Reset token"
            />
            {formErrors.token ? <span className="field-error">{formErrors.token}</span> : null}
          </label>
          <div className="auth-field-group">
            <label htmlFor="reset-password">Password</label>
            <div className="password-input-wrap">
              <input
                autoComplete="new-password"
                id="reset-password"
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
          <label>
            Confirm Password
            <input
              autoComplete="new-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat password"
            />
            {formErrors.confirmPassword ? (
              <span className="field-error">{formErrors.confirmPassword}</span>
            ) : null}
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          {message ? <div className="form-success">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
          <p className="auth-switch">
            Ready to continue? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

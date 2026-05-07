import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { clearAuthFeedback, forgotPassword } from '../store/slices/authSlice';

export function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setFieldError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address');
      return;
    }

    dispatch(forgotPassword({ email: email.trim() }));
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Password Help</p>
        <h2>Reset your password</h2>
        <p className="copy">Enter your email and we will send a secure reset link.</p>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                dispatch(clearAuthFeedback());
                setFieldError('');
                setEmail(event.target.value);
              }}
              placeholder="you@example.com"
            />
            {fieldError ? <span className="field-error">{fieldError}</span> : null}
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          {message ? <div className="form-success">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p className="auth-switch">
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

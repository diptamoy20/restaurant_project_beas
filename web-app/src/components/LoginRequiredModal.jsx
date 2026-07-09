import { useNavigate } from 'react-router-dom';

export function LoginRequiredModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) {
    return null;
  }

  const goToLogin = () => {
    onClose();
    navigate('/login');
  };

  const goToSignUp = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div
      className="location-modal-backdrop login-required-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="location-modal login-required-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="location-modal-close"
          aria-label="Close"
          onClick={onClose}
        />
        <p className="eyebrow">Ordering</p>
        <h2 id="login-required-title">Login Required</h2>
        <p className="copy">
          Please log in or create an account to add items to your cart and
          continue ordering.
        </p>
        <div className="location-modal-actions login-required-actions">
          <button type="button" onClick={goToLogin}>
            Login
          </button>
          <button type="button" className="ghost-button" onClick={goToSignUp}>
            Sign Up
          </button>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

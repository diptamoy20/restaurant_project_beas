import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountSidebar } from '../components/account/AccountSidebar.jsx';
import { AddressManager } from '../components/account/AddressManager.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { updateProfile, uploadProfileImage } from '../store/slices/authSlice';
import { getUserDisplayName } from '../utils/profile';

export function ProfilePage() {
  const dispatch = useDispatch();
  const { user, loading, error, message } = useSelector((state) => state.auth);
  const imageInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
  }, [user]);

  const handleEditImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      dispatch(uploadProfileImage(file));
    }

    event.target.value = '';
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(
      updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      }),
    );
  };

  return (
    <section className="stack profile-page">
      <div className="profile-hero info-card">
        <div className="profile-hero-media">
          <div className="profile-image-editor">
            <ProfileAvatar
              user={user}
              className="profile-avatar profile-avatar-xl"
            />
            <button
              type="button"
              className="profile-image-edit-button"
              aria-label="Edit profile image"
              onClick={handleEditImage}
            >
              <PencilIcon />
            </button>
            <input
              ref={imageInputRef}
              className="profile-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
            />
          </div>
        </div>
        <div className="profile-hero-copy">
          <p className="eyebrow">Profile</p>
          <h2>{getUserDisplayName(user)}</h2>
          <p className="copy">
            Keep your account details and delivery addresses ready for faster checkout.
          </p>
        </div>
      </div>

      <div className="account-layout">
        <AccountSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="account-content">
          {activeSection === 'profile' ? (
            <form className="info-card profile-edit-panel" onSubmit={handleSubmit}>
              <div className="profile-form-header">
                <div>
                  <h3>Personal details</h3>
                  <p>
                    Update the information used for account access and order
                    communication.
                  </p>
                </div>
              </div>

              <div className="profile-form-grid">
                <label>
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Your name"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+919900000001"
                  />
                </label>
              </div>

              {error ? <p className="form-error">{error}</p> : null}
              {message ? <p className="form-success">{message}</p> : null}

              <div className="profile-form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          ) : activeSection === 'support' ? (
            <div className="info-card account-support-panel">
              <div className="profile-form-header">
                <div>
                  <h3>Help & Support</h3>
                  <p>Find quick answers or contact the team about your account and orders.</p>
                </div>
              </div>

              <div className="support-grid">
                <article className="support-card">
                  <span>Orders</span>
                  <h4>Order support</h4>
                  <p>Need help with an active order, cancellation, payment, or invoice?</p>
                  <a href="/orders" className="text-link">View orders</a>
                </article>
                <article className="support-card">
                  <span>Contact</span>
                  <h4>Contact support</h4>
                  <p>Email our support desk and include your order number for faster help.</p>
                  <a href="mailto:support@restaurant-app.local" className="text-link">
                    support@restaurant-app.local
                  </a>
                </article>
                <article className="support-card">
                  <span>FAQs</span>
                  <h4>Common questions</h4>
                  <p>Invoices, payment status, delivery updates, and account changes are handled here.</p>
                </article>
              </div>
            </div>
          ) : (
            <div className="info-card account-address-panel">
              <AddressManager />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 16.6V20h3.4L18.8 8.6l-3.4-3.4L4 16.6Zm13.2-13 3.2 3.2c.4.4.4 1 0 1.4l-1 1-3.4-3.4 1-1c.3-.4.9-.4 1.2-.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

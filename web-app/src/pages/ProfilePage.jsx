import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, uploadProfileImage } from '../store/slices/authSlice';
import { getUserDisplayName, getUserInitials, getUserProfileImage } from '../utils/profile';

export function ProfilePage() {
  const dispatch = useDispatch();
  const { user, loading, error, message } = useSelector((state) => state.auth);
  const imageInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const userImage = getUserProfileImage(user);

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
            <span className="profile-avatar profile-avatar-xl">
              {userImage ? <img src={userImage} alt="" /> : getUserInitials(user)}
            </span>
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
          <p className="eyebrow">Edit profile</p>
          <h2>{getUserDisplayName(user)}</h2>
          <p className="copy">
            Keep your account details ready for faster checkout, delivery updates, and payments.
          </p>
        </div>
      </div>

      <form className="info-card profile-edit-panel" onSubmit={handleSubmit}>
        <div className="profile-form-header">
          <div>
            <h3>Personal details</h3>
            <p>Update the information used for account access and order communication.</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <label>
            <span>Phone</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
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

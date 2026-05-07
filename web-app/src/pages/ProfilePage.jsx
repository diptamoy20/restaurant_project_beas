import { useSelector } from 'react-redux';

export function ProfilePage() {
  const user = useSelector((state) => state.auth.user);

  return (
    <section className="stack">
      <div className="section-heading">
        <p className="eyebrow">Profile</p>
        <h2>Your account</h2>
      </div>
      <div className="info-card profile-card">
        <div>
          <span>Name</span>
          <strong>{user?.name || 'Not added'}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user?.email || 'Not added'}</strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>{user?.phone || 'Not added'}</strong>
        </div>
      </div>
    </section>
  );
}

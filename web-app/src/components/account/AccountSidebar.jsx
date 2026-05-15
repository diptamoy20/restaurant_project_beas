const accountSections = [
  { id: 'profile', label: 'Edit Profile' },
  { id: 'addresses', label: 'Addresses' },
];

export function AccountSidebar({ activeSection, onSectionChange }) {
  return (
    <aside className="account-sidebar" aria-label="Account sections">
      {accountSections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={activeSection === section.id ? 'account-tab active' : 'account-tab'}
          onClick={() => onSectionChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </aside>
  );
}

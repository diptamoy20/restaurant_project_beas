import { useSelector } from 'react-redux';

export function MenuManagementPage() {
  const categories = useSelector((state) => state.menu.categories);

  return (
    <section>
      <p className="eyebrow">Catalog</p>
      <h2>Menu and category management</h2>
      <div className="panel-card">
        {categories.map((category) => (
          <div key={category} className="list-row">
            <span>{category}</span>
            <button type="button">Manage</button>
          </div>
        ))}
      </div>
    </section>
  );
}


import type { QRMenuCategory } from '../../types/menu.types';

interface CategoryTabsProps {
  categories: QRMenuCategory[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number) => void;
}

const categoryIcons: Record<string, string> = {
  pizza: '△',
  burger: '☰',
  dessert: '♨',
  drinks: '♧',
  veg: '✿',
};

function getCategoryIcon(name: string): string {
  const key = Object.keys(categoryIcons).find((category) => name.toLowerCase().includes(category));
  return key ? categoryIcons[key] : '○';
}

export function CategoryTabs({ categories, activeCategoryId, onSelect }: CategoryTabsProps) {
  return (
    <nav className="qr-category-band" aria-label="Menu categories">
      <div className="qr-category-row">
        {categories.map((category) => (
          <button
            className={`qr-category-tab ${activeCategoryId === category.id ? 'is-active' : ''}`}
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
          >
            <span>{getCategoryIcon(category.name)}</span>
            {category.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StickyCartCTA } from '../components/cart/StickyCartCTA';
import { BrandHeader } from '../components/common/BrandHeader';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { StateMessage } from '../components/common/StateMessage';
import { PageShell } from '../components/layout/PageShell';
import { AddOnSheet } from '../components/menu/AddOnSheet';
import { BestSellerStrip } from '../components/menu/BestSellerStrip';
import { CategoryTabs } from '../components/menu/CategoryTabs';
import { FoodCard } from '../components/menu/FoodCard';
import { DEFAULT_ADD_ONS } from '../constants/addOns';
import { useCart } from '../hooks/useCart';
import { useMenu } from '../hooks/useMenu';
import type { AddOnIngredient } from '../types/addOn.types';
import type { QRMenuItem, QRMenuItemVariant } from '../types/menu.types';
import { toNumericRouteId } from '../utils/routeParams';

export function MenuPage() {
  const params = useParams();
  const restaurantId = toNumericRouteId(params.restaurantId);
  const tableId = toNumericRouteId(params.tableId);
  const { data, isLoading, error } = useMenu(restaurantId, tableId);
  const { addItem, getQuantity, setOrderContext } = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [optionItem, setOptionItem] = useState<QRMenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<QRMenuItemVariant | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnIngredient[]>([]);
  const [sheetQuantity, setSheetQuantity] = useState(1);
  const categories = data?.categories ?? [];
  const selectedCategoryId = activeCategoryId;
  const allMenuItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const bestSellerItems = useMemo(() => {
    const seededBestSellerNames = new Set([
      'Margherita Pizza',
      'Veg Burger',
      'Chicken Burger',
      'French Fries',
      'Pasta Alfredo',
      'Cold Coffee',
      'Mojito',
      'Brownie',
    ]);

    return [...allMenuItems]
      .sort((firstItem, secondItem) => {
        const firstRank = seededBestSellerNames.has(firstItem.name) ? 0 : 1;
        const secondRank = seededBestSellerNames.has(secondItem.name) ? 0 : 1;

        if (firstRank !== secondRank) {
          return firstRank - secondRank;
        }

        return firstItem.price - secondItem.price;
      })
      .slice(0, 8);
  }, [allMenuItems]);

  const recommendedItems = useMemo(() => allMenuItems.slice(0, 12), [allMenuItems]);
  const visibleItems = selectedCategory ? selectedCategory.items : recommendedItems;

  useEffect(() => {
    if (!data || !restaurantId || !tableId) {
      return;
    }

    setOrderContext({
      restaurant: data.restaurant,
      restaurantId,
      tableId,
      tableLabel: data.restaurant.tableName,
    });
  }, [data, restaurantId, setOrderContext, tableId]);

  useEffect(() => {
    document.body.classList.toggle('qr-modal-open', Boolean(optionItem));

    return () => {
      document.body.classList.remove('qr-modal-open');
    };
  }, [optionItem]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data || !restaurantId || !tableId) {
    return (
      <PageShell>
        <BrandHeader title="Welcome" tableName={params.tableId} />
        <StateMessage
          title="Menu unavailable"
          message={error || 'We could not load this restaurant menu.'}
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      </PageShell>
    );
  }

  const handleOpenOptions = (item: QRMenuItem) => {
    const defaultVariant = item.variants?.find((variant) => variant.isAvailable);
    setOptionItem(item);
    setSelectedVariant(defaultVariant);
    setSelectedAddOns([]);
    setSheetQuantity(1);
  };

  const handleToggleAddOn = (addOn: AddOnIngredient) => {
    setSelectedAddOns((currentAddOns) =>
      currentAddOns.some((currentAddOn) => currentAddOn.id === addOn.id)
        ? currentAddOns.filter((currentAddOn) => currentAddOn.id !== addOn.id)
        : [...currentAddOns, addOn],
    );
  };

  const handleAddWithOptions = () => {
    if (!optionItem) {
      return;
    }

    addItem(optionItem, {
      variant: selectedVariant,
      addOns: selectedAddOns,
      quantity: sheetQuantity,
    });
    setOptionItem(null);
    setSelectedAddOns([]);
  };

  return (
    <PageShell className="qr-menu-page">
      <BrandHeader
        title="Welcome"
        tableName={data.restaurant.tableName}
        restaurantName={data.restaurant.name}
      />
      {categories.length === 0 ? (
        <StateMessage
          title="No dishes available"
          message="This restaurant has not published any available menu items yet."
        />
      ) : (
        <>
          <CategoryTabs
            categories={categories}
            activeCategoryId={selectedCategoryId}
            onSelect={setActiveCategoryId}
          />
          <section className="qr-menu-content">
            {!selectedCategory ? (
              <BestSellerStrip
                items={bestSellerItems}
                onSelectItem={handleOpenOptions}
                onViewAll={() => {
                  document.getElementById('qr-food-grid')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ) : null}
            <div className="qr-section-title qr-section-title--left">
              <h2>{selectedCategory?.name ?? 'Recommended for you'}</h2>
              <p>
                {selectedCategory?.description ??
                  'Popular picks from today’s QR menu. Choose a category above to filter.'}
              </p>
            </div>
            <div className="qr-food-grid" id="qr-food-grid">
              {visibleItems.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  quantity={getQuantity(item.id)}
                  onOpenOptions={handleOpenOptions}
                />
              ))}
            </div>
          </section>
        </>
      )}
      <AddOnSheet
        item={optionItem}
        addOns={DEFAULT_ADD_ONS}
        selectedAddOns={selectedAddOns}
        selectedVariantId={selectedVariant?.id}
        quantity={sheetQuantity}
        onSelectVariant={setSelectedVariant}
        onToggleAddOn={handleToggleAddOn}
        onIncrease={() => setSheetQuantity((quantity) => quantity + 1)}
        onDecrease={() => setSheetQuantity((quantity) => Math.max(1, quantity - 1))}
        onAdd={handleAddWithOptions}
        onClose={() => {
          setOptionItem(null);
          setSelectedAddOns([]);
        }}
      />
      <StickyCartCTA />
    </PageShell>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { StickyCartCTA } from '../components/cart/StickyCartCTA';
import { BrandHeader } from '../components/common/BrandHeader';
import { SplashScreen } from '../components/common/SplashScreen';
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
  const [hasMinimumSplashElapsed, setHasMinimumSplashElapsed] = useState(false);
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

  const shouldShowSplash = !hasMinimumSplashElapsed || isLoading;

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
    setHasMinimumSplashElapsed(false);
    const timerId = window.setTimeout(() => {
      setHasMinimumSplashElapsed(true);
    }, 2400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [restaurantId, tableId]);

  useEffect(() => {
    if (!optionItem) {
      return undefined;
    }

    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const previousOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.classList.add('qr-modal-open');
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    documentElement.style.overscrollBehavior = 'none';

    return () => {
      body.classList.remove('qr-modal-open');
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [optionItem]);

  if (error || !data || !restaurantId || !tableId) {
    return (
      <>
        <AnimatePresence>{shouldShowSplash ? <SplashScreen key="qr-splash" /> : null}</AnimatePresence>
        {!shouldShowSplash ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <PageShell>
              <BrandHeader title="Welcome" tableName={params.tableId} />
              <StateMessage
                title="Menu unavailable"
                message={error || 'We could not load this restaurant menu.'}
                actionLabel="Try again"
                onAction={() => window.location.reload()}
              />
            </PageShell>
          </motion.div>
        ) : null}
      </>
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
    <>
      <AnimatePresence>{shouldShowSplash ? <SplashScreen key="qr-splash" /> : null}</AnimatePresence>
      {!shouldShowSplash ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
        >
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
        </motion.div>
      ) : null}
    </>
  );
}

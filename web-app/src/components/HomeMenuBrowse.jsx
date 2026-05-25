import { useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToCart,
  addToCartAsync,
  clearError,
} from '../store/slices/cartSlice';
import { fetchMenu } from '../store/slices/menuSlice';
import { getBestSellingMenu } from '../services/menuPublicApi';
import { MenuSlideCard } from '../utils/MenuSlideCard';

const swiperBreakpoints = {
  320: {
    slidesPerView: 1,
    spaceBetween: 12,
  },
  576: {
    slidesPerView: 2,
    spaceBetween: 16,
  },
  768: {
    slidesPerView: 3,
    spaceBetween: 18,
  },
  1024: {
    slidesPerView: 4,
    spaceBetween: 20,
  },
};

export function HomeMenuBrowse({ restaurantId, coordinates }) {
  const dispatch = useDispatch();
  const {
    categories,
    items: menuItems,
    restaurant,
    loading,
    error,
    delivery,
  } = useSelector((state) => state.menu);
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const [bestSelling, setBestSelling] = useState([]);
  const [bestLoading, setBestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!restaurantId) {
      return undefined;
    }

    dispatch(
      fetchMenu({
        restaurantId,
        coordinates,
      }),
    );

    return undefined;
  }, [dispatch, restaurantId, coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBest() {
      setBestLoading(true);

      try {
        const rows = await getBestSellingMenu({
          lat: coordinates?.lat,
          lng: coordinates?.lng,
          limit: 18,
          signal: controller.signal,
        });

        setBestSelling(Array.isArray(rows) ? rows : []);
      } catch {
        setBestSelling([]);
      } finally {
        setBestLoading(false);
      }
    }

    loadBest();

    return () => controller.abort();
  }, [coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    setActiveTab(0);
  }, [restaurantId]);

  const tabCategories = useMemo(() => {
    if (categories?.length) {
      return categories;
    }

    const map = new Map();

    for (const item of menuItems) {
      const label = item.category?.name || 'Menu';

      if (!map.has(label)) {
        map.set(label, []);
      }

      map.get(label).push(item);
    }

    return [...map.entries()].map(([name, groupedItems]) => ({
      name,
      items: groupedItems,
    }));
  }, [categories, menuItems]);

  const visibleCategory =
    tabCategories[activeTab] ?? tabCategories[0] ?? null;

  const handleAddToCart = async (item) => {
    setToast('');
    dispatch(clearError());

    try {
      if (isAuthenticated) {
        await dispatch(
          addToCartAsync({
            menuItemId: item.id,
            quantity: 1,
          }),
        ).unwrap();
      } else {
        dispatch(
          addToCart({
            item,
            quantity: 1,
          }),
        );
      }

      setToast(`${item.name} added to cart`);
      window.setTimeout(() => setToast(''), 2600);
    } catch {
      /* slice surfaces cart errors */
    }
  };

  if (!restaurantId) {
    return (
      <section className="home-menu-browse home-menu-browse--empty">
        <div className="section-heading">
          <p className="eyebrow">Browse menu</p>
          <h2>Pick a restaurant to explore dishes</h2>
          <p className="copy">
            Use the restaurant picker in the navigation bar to load menus tailored to your
            selection.
          </p>
        </div>
      </section>
    );
  }

  if (loading && !restaurant) {
    return (
      <section className="home-menu-browse">
        <p className="eyebrow">Loading curated picks…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="home-menu-browse">
        <p className="order-status-banner error">{error}</p>
      </section>
    );
  }

  return (
    <section className="home-menu-browse">
      <div className="home-menu-browse-header">
        <div>
          <p className="eyebrow">Fresh from the kitchen</p>
          <h2>{restaurant?.name ?? `Restaurant #${restaurantId}`}</h2>
          <p className="copy-muted">
            {restaurant?.address}
            {restaurant?.city ? ` · ${restaurant.city}` : ''}
          </p>
        </div>

        {delivery ? (
          <div
            className={
              delivery.deliveryAvailable
                ? 'delivery-quote success'
                : 'delivery-quote warning'
            }
          >
            <strong>
              {delivery.deliveryAvailable
                ? 'Delivery available'
                : 'Outside delivery zone'}
            </strong>
            <span>
              {delivery.distanceKm != null ? `${delivery.distanceKm} km · ` : ''}
              {delivery.estimatedDeliveryTimeMinutes ?? '—'} min · Rs.{' '}
              {Number(delivery.deliveryFee ?? 0).toFixed(0)} fee
            </span>
          </div>
        ) : null}
      </div>

      {toast ? <div className="order-status-banner success">{toast}</div> : null}

      {tabCategories.length ? (
        <div className="category-tabs" role="tablist">
          {tabCategories.map((cat, index) => (
            <button
              key={cat.name}
              type="button"
              role="tab"
              aria-selected={index === activeTab}
              className={
                index === activeTab ? 'category-tab is-active' : 'category-tab'
              }
              onClick={() => setActiveTab(index)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : null}

      {visibleCategory?.items?.length ? (
        <div className="menu-carousel-block">
          <div className="menu-carousel-heading">
            <h3>{visibleCategory.name}</h3>
            <p>{visibleCategory.items.length} dishes</p>
          </div>

          <Swiper
            key={`cat-${restaurantId}-${visibleCategory.name}`}
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            loop={visibleCategory.items.length > 4}
            breakpoints={swiperBreakpoints}
            className="menu-swiper"
          >
            {visibleCategory.items.map((item) => (
              <SwiperSlide key={item.id}>
                <MenuSlideCard
                  item={item}
                  onAdd={() => handleAddToCart(item)}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : (
        <p className="copy-muted">
          No dishes available for this category.
        </p>
      )}

      <div className="menu-carousel-block">
        <div className="menu-carousel-heading">
          <h3>Best sellers</h3>
          <p>
            {bestLoading ? 'Loading favourites…' : `${bestSelling.length} spotlight dishes`}
          </p>
        </div>

        {!bestLoading && bestSelling.length === 0 ? (
          <p className="copy-muted">
            Best sellers will appear when chefs mark signature plates in the admin console.
          </p>
        ) : null}

        {bestSelling.length ? (
          <Swiper
            key={`best-${restaurantId}`}
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            loop={bestSelling.length > 4}
            breakpoints={swiperBreakpoints}
            className="menu-swiper"
          >
            {bestSelling.map((item) => (
              <SwiperSlide key={`best-${item.id}`}>
                <MenuSlideCard
                  item={item}
                  onAdd={() => handleAddToCart(item)}
                  subtitle={item.restaurant?.name}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>
    </section>
  );
}



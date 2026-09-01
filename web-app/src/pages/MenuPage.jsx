import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { clearError } from "../store/slices/cartSlice";
import { useAddToCart } from "../hooks/useAddToCart";
import { useItemCustomizer } from "../hooks/useItemCustomizer";
import { ItemCustomizerModal } from "../components/ItemCustomizerModal";
import { isCrossRestaurantError } from "../utils/cartRestaurant";
import { fetchMenu } from "../store/slices/menuSlice";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "../store/slices/favoritesSlice";
import { useSelectedRestaurant } from "../context/SelectedRestaurantContext.jsx";
import { useNearbyRestaurants } from "../hooks/useNearbyRestaurants";
import { useUserLocation } from "../hooks/useUserLocation";
import {
  getRestaurantIdFromUrl,
  resolveMenuRestaurant,
} from "../lib/restaurantSelection";
import { buildMenuPath, persistRestaurantSlug } from "../lib/restaurantPaths";
import {
  persistRestaurantId,
  persistTableId,
  resolveTableId,
} from "../lib/tableSession";
import { getBestSellingMenu } from "../services/menuPublicApi";
import { MenuSlideCard } from "../utils/MenuSlideCard";
import HorizontalCarousel from "../components/HorizontalCarousel";
const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MenuPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams();
  const locationFlow = useUserLocation();
  const nearby = useNearbyRestaurants(locationFlow.location);
  const { selectedRestaurantId, selectedRestaurantSlug, setSelectedRestaurant } =
    useSelectedRestaurant();
  const {
    items,
    loading,
    error,
    restaurantId: menuRestaurantId,
    restaurant,
    categories,
    delivery,
  } = useSelector((state) => state.menu);

  const { error: cartError } = useSelector((state) => state.cart);
  const visibleCartError =
    cartError && !isCrossRestaurantError(cartError) ? cartError : null;

  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const { addItemToCart } = useAddToCart();

  // Favorites state
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const favoritesToggling = useSelector((state) => state.favorites.toggling);

  // Load favorites once when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, isAuthenticated]);

  const handleToggleFavorite = (item) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (favoriteIds.includes(item.id)) {
      dispatch(removeFavorite(item.id));
    } else {
      dispatch(addFavorite(item.id));
    }
  };

  const urlRestaurantId = getRestaurantIdFromUrl(location.search);
  const urlRestaurantSlug = routeSlug || null;

  const activeRestaurant = useMemo(
    () =>
      resolveMenuRestaurant({
        urlRestaurantId,
        urlRestaurantSlug,
        selectedRestaurantId,
        selectedRestaurantSlug,
        nearbyRestaurants: nearby.restaurants,
        location: locationFlow.location,
      }),
    [
      urlRestaurantId,
      urlRestaurantSlug,
      selectedRestaurantId,
      selectedRestaurantSlug,
      nearby.restaurants,
      locationFlow.location,
    ],
  );

  const activeRestaurantId = activeRestaurant.id;
  const activeRestaurantSlug =
    activeRestaurant.slug || restaurant?.slug || urlRestaurantSlug;

  const isMenuStale =
    Boolean(activeRestaurantSlug) &&
    restaurant?.slug !== activeRestaurantSlug;

  // States for Filtering and Searching
  const [frequentItems, setFrequentItems] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [bestSellingLoading, setBestSellingLoading] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("recommended");
  const [foodTypeFilter, setFoodTypeFilter] = useState(null); // 'VEG', 'NON_VEG', or null

  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    const nextTableId = resolveTableId(location.search);

    if (nextTableId) {
      persistTableId(nextTableId);
    }
  }, [location.search]);

  useEffect(() => {
    if (!activeRestaurantId && !activeRestaurantSlug) {
      return;
    }

    if (activeRestaurantId) {
      persistRestaurantId(activeRestaurantId);
    }

    if (activeRestaurantSlug) {
      persistRestaurantSlug(activeRestaurantSlug);
    }

    setSelectedRestaurant({
      id: activeRestaurantId ?? selectedRestaurantId,
      slug: activeRestaurantSlug,
    });
  }, [
    activeRestaurantId,
    activeRestaurantSlug,
    selectedRestaurantId,
    setSelectedRestaurant,
  ]);

  useEffect(() => {
    if (!urlRestaurantId || urlRestaurantSlug) {
      return undefined;
    }

    let cancelled = false;

    api
      .get(`/v1/restaurants/${urlRestaurantId}`)
      .then((data) => {
        if (!cancelled && data?.slug) {
          navigate(
            buildMenuPath(data.slug, {
              tableId: resolveTableId(location.search),
            }),
            { replace: true },
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [urlRestaurantId, urlRestaurantSlug, location.search, navigate]);

  useEffect(() => {
    if (urlRestaurantSlug || urlRestaurantId || !activeRestaurantSlug) {
      return;
    }

    navigate(
      buildMenuPath(activeRestaurantSlug, {
        tableId: resolveTableId(location.search),
      }),
      { replace: true },
    );
  }, [
    activeRestaurantSlug,
    urlRestaurantId,
    urlRestaurantSlug,
    location.search,
    navigate,
  ]);

  useEffect(() => {
    if (!activeRestaurantSlug && !activeRestaurantId) {
      return;
    }

    dispatch(
      fetchMenu({
        restaurantId: activeRestaurantId,
        restaurantSlug: activeRestaurantSlug,
        coordinates: locationFlow.location,
      }),
    );
  }, [
    dispatch,
    activeRestaurantId,
    activeRestaurantSlug,
    locationFlow.location?.lat,
    locationFlow.location?.lng,
  ]);

  useEffect(() => {
    setActiveCategoryId(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setFrequentItems([]);
    setBestSelling([]);
  }, [activeRestaurantId, activeRestaurantSlug]);

  // Fetch user-specific and restaurant-specific frequently ordered items
  useEffect(() => {
    if (isAuthenticated && activeRestaurantSlug) {
      api
        .get(
          `/menu/restaurant/slug/${encodeURIComponent(activeRestaurantSlug)}/frequent`,
        )
        .then((data) => {
          setFrequentItems(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          setFrequentItems([]);
        });
    } else {
      setFrequentItems([]);
    }
  }, [isAuthenticated, activeRestaurantSlug]);

  useEffect(() => {
    if (!activeRestaurantId && !activeRestaurantSlug) {
      setBestSelling([]);
      return undefined;
    }

    const controller = new AbortController();

    async function loadBestSelling() {
      setBestSellingLoading(true);

      try {
        const rows = await getBestSellingMenu({
          lat: locationFlow.location?.lat,
          lng: locationFlow.location?.lng,
          restaurantId: activeRestaurantId,
          limit: 18,
          signal: controller.signal,
        });

        const list = Array.isArray(rows) ? rows : [];
        setBestSelling(
          list.filter(
            (row) => Number(row.restaurantId) === Number(activeRestaurantId),
          ),
        );
      } catch {
        setBestSelling([]);
      } finally {
        setBestSellingLoading(false);
      }
    }

    loadBestSelling();

    return () => controller.abort();
  }, [
    activeRestaurantId,
    locationFlow.location?.lat,
    locationFlow.location?.lng,
  ]);

  // Debounce search query to prevent excessive layout shifts
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute final filtered and sorted menu items (client-side)
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Category Filter
    if (activeCategoryId) {
      result = result.filter(
        (item) => item.categoryId === Number(activeCategoryId),
      );
    }

    // 2. Veg / Non Veg Toggle Filter
    if (foodTypeFilter) {
      result = result.filter((item) => item.foodType === foodTypeFilter);
    }

    // 3. Search Filter (Case insensitive)
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description &&
            item.description.toLowerCase().includes(query)) ||
          (item.category?.name &&
            item.category.name.toLowerCase().includes(query)),
      );
    }

    // 4. Sorting logic
    if (sortOption === "price-low-high") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-high-low") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === "most-popular") {
      result.sort(
        (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
      );
    } else if (sortOption === "recommended") {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [
    items,
    activeCategoryId,
    foodTypeFilter,
    debouncedSearchQuery,
    sortOption,
  ]);

  const handleAddToCart = async (
    item,
    variant = null,
    addOns = [],
    quantity = 1,
  ) => {
    setCartMessage("");
    dispatch(clearError());

    const added = await addItemToCart(item, variant, addOns, quantity);

    if (added) {
      setCartMessage(`${item.name} added to cart.`);
    }
  };

  const customizer = useItemCustomizer({ addToCart: handleAddToCart });

  const handleAddOrCustomize = (item) => {
    if (customizer.hasCustomization(item)) {
      customizer.open(item);
    } else {
      handleAddToCart(item);
    }
  };

  if (!activeRestaurantSlug && !activeRestaurantId) {
    if (nearby.loading) {
      return (
        <section>
          <div className="section-header">
            <div>
              <p className="eyebrow">Menu</p>
              <h2>Finding nearby restaurants…</h2>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>No restaurant available</h2>
            <p>
              {locationFlow.location
                ? "No restaurants were found within your delivery area. Try searching for a restaurant using the picker in the navigation bar."
                : "Enable your location or choose a restaurant from the navigation bar to browse a menu."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loading || isMenuStale) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Loading menu...</h2>
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Error loading menu</h2>
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ paddingBottom: "6rem" }}>
      {/* Header section with delivery quota */}
      <div className="section-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h2>{restaurant?.name ?? "Restaurant menu"}</h2>
          <p>{restaurant?.address ?? "Fresh dishes prepared for you"}</p>
        </div>
        {/* {delivery ? (
          <div
            className={
              delivery.deliveryAvailable
                ? "delivery-quote success"
                : "delivery-quote warning"
            }
          >
            <strong>
              {delivery.deliveryAvailable
                ? "Delivery available"
                : "Delivery unavailable"}
            </strong>
            <span>
              {delivery.distanceKm != null
                ? `${delivery.distanceKm} km away`
                : "Distance unavailable"}
            </span>
          </div>
        ) : null} */}
        {cartMessage ? (
          <div className="order-status-banner success">{cartMessage}</div>
        ) : null}
        {visibleCartError ? (
          <div className="order-status-banner error">{visibleCartError}</div>
        ) : null}
      </div>

      {/* 2. BEST SELLING SECTION */}
      {(bestSellingLoading || bestSelling.length > 0) && (
        <div className="frequent-section">
          <h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              style={{ width: "1.25rem" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 00.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            Best Sellers
          </h3>
          {bestSellingLoading ? (
            <p className="copy-muted">Loading favourites…</p>
          ) : (
            <HorizontalCarousel className="frequent-scroll" arrowLabel="Best sellers">
              {bestSelling.map((item) => {
                const price =
                  item.discountPrice != null && item.discountPrice > 0
                    ? item.discountPrice
                    : item.price;
                const customizations = customizer.hasCustomization(item);

                return (
                  <div key={`best-${item.id}`} className="frequent-card">
                    <div className="frequent-card-media">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="menu-slide-placeholder" />
                      )}
                      <span className="food-type-icon">
                        {item.foodType === "NON_VEG" ? (
                          <div className="nonveg-tag-indicator" />
                        ) : (
                          <div className="veg-tag-indicator" />
                        )}
                      </span>
                    </div>
                    <div className="frequent-card-info">
                      <h4>{item.name}</h4>
                      <div className="frequent-card-footer">
                        <span className="frequent-card-price">
                          {formatRupees.format(price)}
                        </span>
                        <button
                          type="button"
                          className="frequent-add-btn"
                          onClick={() => handleAddOrCustomize(item)}
                        >
                          Add {customizations ? "+" : ""}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </HorizontalCarousel>
          )}
        </div>
      )}

      {/* 3. FREQUENTLY ORDERED SECTION */}
      {frequentItems.length > 0 && (
        <div className="frequent-section">
          <h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              style={{ width: "1.25rem" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
              />
            </svg>
            Frequently Ordered
          </h3>
          <HorizontalCarousel className="frequent-scroll" arrowLabel="Frequently ordered">
            {frequentItems.map((item) => {
              const price =
                item.discountPrice != null && item.discountPrice > 0
                  ? item.discountPrice
                  : item.price;
              const customizations = customizer.hasCustomization(item);

              return (
                <div key={`frequent-${item.id}`} className="frequent-card">
                  <div className="frequent-card-media">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="menu-slide-placeholder" />
                    )}
                    <span className="food-type-icon">
                      {item.foodType === "NON_VEG" ? (
                        <div className="nonveg-tag-indicator" />
                      ) : (
                        <div className="veg-tag-indicator" />
                      )}
                    </span>
                  </div>
                  <div className="frequent-card-info">
                    <h4>{item.name}</h4>
                    <div className="frequent-card-footer">
                      <span className="frequent-card-price">
                        {formatRupees.format(price)}
                      </span>
                      <button
                        type="button"
                        className="frequent-add-btn"
                        onClick={() => handleAddOrCustomize(item)}
                      >
                        Add {customizations ? "+" : ""}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </HorizontalCarousel>
        </div>
      )}

      {/* 4. CATEGORIES + SEARCH + SORTING STICKY FILTER SECTION */}
      <div className="sticky-filter-wrapper">
        <div className="filter-container">
          {/* Left half: scrollable category list */}
          <HorizontalCarousel
            className="categories-scroll"
            arrowLabel="Categories"
            selectedKey={activeCategoryId ?? "all"}
          >
            <button
              data-key="all"
              className={`category-pill ${activeCategoryId === null ? "active" : ""}`}
              onClick={() => setActiveCategoryId(null)}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={`cat-pill-${cat.id}`}
                data-key={cat.id}
                className={`category-pill ${activeCategoryId === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </HorizontalCarousel>

          {/* Right half: Search, sorting and Veg/Non-Veg toggles */}
          <div className="filter-controls">
            <div className="search-input-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="sort-dropdown"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="most-popular">Most Popular</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
            </select>

            <div className="food-toggle-buttons">
              <button
                className={`toggle-btn veg ${foodTypeFilter === "VEG" ? "active" : ""}`}
                onClick={() =>
                  setFoodTypeFilter((prev) => (prev === "VEG" ? null : "VEG"))
                }
              >
                Veg
              </button>
              <button
                className={`toggle-btn non-veg ${foodTypeFilter === "NON_VEG" ? "active" : ""}`}
                onClick={() =>
                  setFoodTypeFilter((prev) =>
                    prev === "NON_VEG" ? null : "NON_VEG",
                  )
                }
              >
                Non-Veg
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Items Display List */}
      {filteredItems.length === 0 ? (
        <div
          className="empty-state"
          style={{ textAlign: "center", paddingBlock: "3rem" }}
        >
          <h3>No items found</h3>
          <p>
            We couldn't find any dishes matching your filters or search query.
            Try clearing them.
          </p>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map((item) => (
            <MenuSlideCard
              key={`menu-item-${item.id}`}
              item={item}
              isFavorite={favoriteIds.includes(item.id)}
              isTogglingFavorite={!!favoritesToggling[item.id]}
              onToggleFavorite={handleToggleFavorite}
              onAdd={() => handleAddOrCustomize(item)}
            />
          ))}
        </div>
      )}

      {/* SWIGGY-STYLE CUSTOMIZATION SHEET POPUP MODAL */}
      <ItemCustomizerModal {...customizer} />
    </section>
  );
}

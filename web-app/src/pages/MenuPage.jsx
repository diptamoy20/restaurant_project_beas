import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import {
  clearError,
  getEffectiveMenuPrice,
} from "../store/slices/cartSlice";
import { useAddToCart } from "../hooks/useAddToCart";
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

  // Customizer popup modal states
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customizerQuantity, setCustomizerQuantity] = useState(1);
  const [customizerError, setCustomizerError] = useState("");

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

  // Lock background scroll when customizing sheet is open
  useEffect(() => {
    if (customizingItem) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [customizingItem]);



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



  // Customizer Helper Functions
  const handleToggleAddon = (group, option) => {
    setSelectedAddons((current) => {
      const isSelected = current.some(
        (addon) => addon.addonOptionId === option.id,
      );

      if (isSelected) {
        return current.filter((addon) => addon.addonOptionId !== option.id);
      }

      // If single choice group, filter out other options from same group
      if (group.selectionType === "SINGLE") {
        const filtered = current.filter(
          (addon) => addon.addonGroupId !== group.id,
        );
        return [
          ...filtered,
          {
            addonGroupId: group.id,
            addonGroupName: group.name,
            addonOptionId: option.id,
            addonOptionName: option.name,
            name: option.name,
            price: option.price,
          },
        ];
      }

      // Check maxSelect limits
      const groupSelections = current.filter(
        (addon) => addon.addonGroupId === group.id,
      );
      if (group.maxSelect && groupSelections.length >= group.maxSelect) {
        setCustomizerError(
          `You can select a maximum of ${group.maxSelect} options for ${group.name}`,
        );
        return current;
      }

      setCustomizerError("");
      return [
        ...current,
        {
          addonGroupId: group.id,
          addonGroupName: group.name,
          addonOptionId: option.id,
          addonOptionName: option.name,
          name: option.name,
          price: option.price,
        },
      ];
    });
  };

  const handleAddCustomizedToCart = () => {
    setCustomizerError("");

    // Validate required groups
    const activeGroups =
      customizingItem.addonGroups?.filter((g) => g.options.length > 0) || [];
    for (const group of activeGroups) {
      const selections = selectedAddons.filter(
        (addon) => addon.addonGroupId === group.id,
      );

      const minSelect = group.isRequired
        ? Math.max(group.minSelect ?? 1, 1)
        : (group.minSelect ?? 0);

      if (selections.length < minSelect) {
        setCustomizerError(
          `Please select at least ${minSelect} option(s) for ${group.name}`,
        );
        return;
      }
    }

    handleAddToCart(
      customizingItem,
      selectedVariant,
      selectedAddons,
      customizerQuantity,
    );
    setCustomizingItem(null);
  };

  // Dynamically calculate customized unit price
  const customizedUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const base = getEffectiveMenuPrice(customizingItem, selectedVariant);
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0,
    );
    return base + addonsTotal;
  }, [customizingItem, selectedVariant, selectedAddons]);

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
        {delivery ? (
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
        ) : null}
        {cartMessage ? (
          <div className="order-status-banner success">{cartMessage}</div>
        ) : null}
        {cartError ? (
          <div className="order-status-banner error">{cartError}</div>
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
            <div className="frequent-scroll">
              {bestSelling.map((item) => {
                const price =
                  item.discountPrice != null && item.discountPrice > 0
                    ? item.discountPrice
                    : item.price;
                const hasVariants = item.variants && item.variants.length > 0;
                const hasAddons =
                  item.addonGroups && item.addonGroups.length > 0;

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
                          onClick={() => {
                            if (hasVariants || hasAddons) {
                              setCustomizingItem(item);
                              setSelectedVariant(item.variants?.[0] || null);
                              setSelectedAddons([]);
                              setCustomizerQuantity(1);
                              setCustomizerError("");
                            } else {
                              handleAddToCart(item);
                            }
                          }}
                        >
                          Add {hasVariants || hasAddons ? "+" : ""}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
          <div className="frequent-scroll">
            {frequentItems.map((item) => {
              const price =
                item.discountPrice != null && item.discountPrice > 0
                  ? item.discountPrice
                  : item.price;
              const hasVariants = item.variants && item.variants.length > 0;
              const hasAddons = item.addonGroups && item.addonGroups.length > 0;

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
                        onClick={() => {
                          if (hasVariants || hasAddons) {
                            setCustomizingItem(item);
                            setSelectedVariant(item.variants?.[0] || null);
                            setSelectedAddons([]);
                            setCustomizerQuantity(1);
                            setCustomizerError("");
                          } else {
                            handleAddToCart(item);
                          }
                        }}
                      >
                        Add {hasVariants || hasAddons ? "+" : ""}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CATEGORIES + SEARCH + SORTING STICKY FILTER SECTION */}
      <div className="sticky-filter-wrapper">
        <div className="filter-container">
          {/* Left half: scrollable category list */}
          <div className="categories-scroll">
            <button
              className={`category-pill ${activeCategoryId === null ? "active" : ""}`}
              onClick={() => setActiveCategoryId(null)}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={`cat-pill-${cat.id}`}
                className={`category-pill ${activeCategoryId === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

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
          {filteredItems.map((item) => {
            const hasVariants = item.variants && item.variants.length > 0;
            const hasAddons = item.addonGroups && item.addonGroups.length > 0;

            return (
              <MenuSlideCard
                key={`menu-item-${item.id}`}
                item={item}
                isFavorite={favoriteIds.includes(item.id)}
                isTogglingFavorite={!!favoritesToggling[item.id]}
                onToggleFavorite={handleToggleFavorite}
                onAdd={() => {
                  if (hasVariants || hasAddons) {
                    setCustomizingItem(item);
                    setSelectedVariant(item.variants?.[0] || null);
                    setSelectedAddons([]);
                    setCustomizerQuantity(1);
                    setCustomizerError("");
                  } else {
                    handleAddToCart(item);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* 4. SWIGGY-STYLE CUSTOMIZATION SHEET POPUP MODAL */}
      {customizingItem && (
        <div
          className="customizer-overlay"
          onClick={() => setCustomizingItem(null)}
        >
          <div
            className="customizer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="customizer-header">
              <div className="customizer-header-info">
                {customizingItem.imageUrl ? (
                  <img src={customizingItem.imageUrl} alt="" />
                ) : (
                  <div
                    className="menu-slide-placeholder"
                    style={{ width: "60px", height: "60px" }}
                  />
                )}
                <div className="customizer-header-copy">
                  <h2>{customizingItem.name}</h2>
                  <p>
                    {customizingItem.description ||
                      "Freshly cooked to your requirements."}
                  </p>
                  <strong>{formatRupees.format(customizedUnitPrice)}</strong>
                </div>
              </div>
              <button
                type="button"
                className="customizer-close"
                onClick={() => setCustomizingItem(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Customization Content */}
            <div className="customizer-body">
              {/* Option 1: Variants Selector (Capsules) */}
              {customizingItem.variants &&
                customizingItem.variants.length > 0 && (
                  <div className="customizer-variant-section">
                    <h3>Select Variant / Size</h3>
                    <div className="customizer-variant-grid">
                      {customizingItem.variants.map((v) => (
                        <div
                          key={`variant-${v.id}`}
                          className={`customizer-variant-pill ${selectedVariant?.id === v.id ? "selected" : ""}`}
                          onClick={() => setSelectedVariant(v)}
                        >
                          <span>{v.name}</span>
                          <strong>{formatRupees.format(v.price)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Option 2: Addon Groups */}
              {customizingItem.addonGroups &&
                customizingItem.addonGroups
                  .filter((g) => g.options.length > 0)
                  .map((group) => {
                    const maxSelect =
                      group.selectionType === "SINGLE" ? 1 : group.maxSelect;

                    return (
                      <div
                        key={`addon-group-${group.id}`}
                        className="customizer-option-group"
                      >
                        <div className="customizer-group-title">
                          <div>
                            <h3>{group.name}</h3>
                            {maxSelect && (
                              <span className="customizer-group-limits">
                                Choose up to {maxSelect} option(s)
                              </span>
                            )}
                          </div>
                          <span
                            className={`customizer-group-badge ${group.isRequired ? "required" : ""}`}
                          >
                            {group.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>

                        <div className="customizer-option-list">
                          {group.options.map((opt) => {
                            const isChecked = selectedAddons.some(
                              (addon) => addon.addonOptionId === opt.id,
                            );
                            const inputType =
                              group.selectionType === "SINGLE"
                                ? "radio"
                                : "checkbox";

                            return (
                              <div
                                key={`option-${opt.id}`}
                                className={`customizer-option-row ${isChecked ? "checked" : ""}`}
                                onClick={() => handleToggleAddon(group, opt)}
                              >
                                <label
                                  className="customizer-option-label"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type={inputType}
                                    name={`group-${group.id}`}
                                    checked={isChecked}
                                    onChange={() =>
                                      handleToggleAddon(group, opt)
                                    }
                                  />
                                  <span>{opt.name}</span>
                                </label>
                                <span className="customizer-option-price">
                                  + {formatRupees.format(opt.price)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* Error alerts */}
            {customizerError && (
              <div
                className="customizer-addon-error"
                style={{ margin: "1rem" }}
              >
                {customizerError}
              </div>
            )}

            {/* Footer with Quantities Stepper and Checkout Action */}
            <div className="customizer-footer">
              <div className="customizer-stepper">
                <button
                  type="button"
                  className="customizer-stepper-button"
                  onClick={() =>
                    setCustomizerQuantity((q) => Math.max(1, q - 1))
                  }
                  disabled={customizerQuantity <= 1}
                >
                  -
                </button>
                <strong>{customizerQuantity}</strong>
                <button
                  type="button"
                  className="customizer-stepper-button"
                  onClick={() => setCustomizerQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="primary-btn customizer-add-btn"
                onClick={handleAddCustomizedToCart}
              >
                Add Item -{" "}
                {formatRupees.format(customizedUnitPrice * customizerQuantity)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

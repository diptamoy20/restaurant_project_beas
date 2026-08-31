import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError } from "../store/slices/cartSlice";
import { useAddToCart } from "../hooks/useAddToCart";
import { useItemCustomizer } from "../hooks/useItemCustomizer";
import { ItemCustomizerModal } from "../components/ItemCustomizerModal";
import { isCrossRestaurantError } from "../utils/cartRestaurant";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "../store/slices/favoritesSlice";
import { MenuSlideCard } from "../utils/MenuSlideCard";

export function FavoritesPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const { addItemToCart } = useAddToCart();

  const {
    items: favoriteItems,
    ids: favoriteIds,
    toggling: favoritesToggling,
    loading,
    error,
  } = useSelector((state) => state.favorites);

  const { error: cartError } = useSelector((state) => state.cart);
  const visibleCartError =
    cartError && !isCrossRestaurantError(cartError) ? cartError : null;
  const [cartMessage, setCartMessage] = useState("");

  // Fetch favorites on mount / when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, isAuthenticated]);

  const handleToggleFavorite = (item) => {
    if (!isAuthenticated) return;
    if (favoriteIds.includes(item.id)) {
      dispatch(removeFavorite(item.id));
    } else {
      dispatch(addFavorite(item.id));
    }
  };

  const handleAddToCart = async (item, variant = null, addOns = [], quantity = 1) => {
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

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Favorites</p>
            <h2>Sign in to see your favorites</h2>
            <p>Save your favourite dishes by tapping the heart icon on any menu item.</p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Favorites</p>
            <h2>Loading favorites…</h2>
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
            <p className="eyebrow">Favorites</p>
            <h2>Could not load favorites</h2>
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ paddingBottom: "6rem" }}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Your collection</p>
          <h2>Favorites</h2>
          <p>
            {favoriteItems.length > 0
              ? `${favoriteItems.length} saved item${favoriteItems.length !== 1 ? "s" : ""}`
              : "Tap the heart on any dish to save it here."}
          </p>
        </div>
      </div>

      {cartMessage ? (
        <div className="order-status-banner success" style={{ margin: "0 1.5rem 1rem" }}>
          {cartMessage}
        </div>
      ) : null}
      {visibleCartError ? (
        <div className="order-status-banner error" style={{ margin: "0 1.5rem 1rem" }}>
          {visibleCartError}
        </div>
      ) : null}

      {favoriteItems.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", paddingBlock: "3rem" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            fill="none"
            style={{ width: "3rem", marginBottom: "1rem", opacity: 0.35 }}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <h3>No favorites yet</h3>
          <p>Browse the menu and tap the heart icon to save dishes you love.</p>
        </div>
      ) : (
        <div className="menu-grid">
          {favoriteItems.map((item) => (
            <MenuSlideCard
              key={`fav-${item.id}`}
              item={item}
              isFavorite={favoriteIds.includes(item.id)}
              isTogglingFavorite={!!favoritesToggling[item.id]}
              onToggleFavorite={handleToggleFavorite}
              onAdd={() => handleAddOrCustomize(item)}
            />
          ))}
        </div>
      )}

      {/* Customizer modal — shared with MenuPage */}
      <ItemCustomizerModal {...customizer} />
    </section>
  );
}

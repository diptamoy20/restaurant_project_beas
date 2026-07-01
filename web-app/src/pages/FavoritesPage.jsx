import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  addToCartAsync,
  clearError,
  getEffectiveMenuPrice,
} from "../store/slices/cartSlice";
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from "../store/slices/favoritesSlice";
import { MenuSlideCard } from "../utils/MenuSlideCard";

const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function FavoritesPage() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => !!state.auth.token);

  const {
    items: favoriteItems,
    ids: favoriteIds,
    toggling: favoritesToggling,
    loading,
    error,
  } = useSelector((state) => state.favorites);

  const { error: cartError } = useSelector((state) => state.cart);
  const [cartMessage, setCartMessage] = useState("");

  // Customizer state — mirrors MenuPage exactly
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customizerQuantity, setCustomizerQuantity] = useState(1);
  const [customizerError, setCustomizerError] = useState("");

  // Fetch favorites on mount / when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchFavorites());
    }
  }, [dispatch, isAuthenticated]);

  // Lock background scroll when customizer is open
  useEffect(() => {
    if (customizingItem) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [customizingItem]);

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
    try {
      if (isAuthenticated) {
        await dispatch(addToCartAsync({ item, variant, addOns, quantity })).unwrap();
      } else {
        dispatch(addToCart({ item, variant, addOns, quantity }));
      }
      setCartMessage(`${item.name} added to cart.`);
    } catch {
      // error already in cart state
    }
  };

  const handleToggleAddon = (group, option) => {
    setSelectedAddons((current) => {
      const isSelected = current.some((a) => a.addonOptionId === option.id);
      if (isSelected) {
        return current.filter((a) => a.addonOptionId !== option.id);
      }
      if (group.selectionType === "SINGLE") {
        return [
          ...current.filter((a) => a.addonGroupId !== group.id),
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
      const groupSelections = current.filter((a) => a.addonGroupId === group.id);
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
    const activeGroups = customizingItem.addonGroups?.filter((g) => g.options.length > 0) || [];
    for (const group of activeGroups) {
      const selections = selectedAddons.filter((a) => a.addonGroupId === group.id);
      const minSelect = group.isRequired ? Math.max(group.minSelect ?? 1, 1) : (group.minSelect ?? 0);
      if (selections.length < minSelect) {
        setCustomizerError(`Please select at least ${minSelect} option(s) for ${group.name}`);
        return;
      }
    }
    handleAddToCart(customizingItem, selectedVariant, selectedAddons, customizerQuantity);
    setCustomizingItem(null);
  };

  const customizedUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const base = getEffectiveMenuPrice(customizingItem, selectedVariant);
    return base + selectedAddons.reduce((sum, a) => sum + a.price, 0);
  }, [customizingItem, selectedVariant, selectedAddons]);

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
      {cartError ? (
        <div className="order-status-banner error" style={{ margin: "0 1.5rem 1rem" }}>
          {cartError}
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
          {favoriteItems.map((item) => {
            const hasVariants = item.variants && item.variants.length > 0;
            const hasAddons = item.addonGroups && item.addonGroups.length > 0;
            return (
              <MenuSlideCard
                key={`fav-${item.id}`}
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

      {/* Customizer modal — identical to MenuPage */}
      {customizingItem && (
        <div className="customizer-overlay" onClick={() => setCustomizingItem(null)}>
          <div className="customizer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="customizer-header">
              <div className="customizer-header-info">
                {customizingItem.imageUrl ? (
                  <img src={customizingItem.imageUrl} alt="" />
                ) : (
                  <div className="menu-slide-placeholder" style={{ width: "60px", height: "60px" }} />
                )}
                <div className="customizer-header-copy">
                  <h2>{customizingItem.name}</h2>
                  <p>{customizingItem.description || "Freshly cooked to your requirements."}</p>
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

            <div className="customizer-body">
              {customizingItem.variants && customizingItem.variants.length > 0 && (
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

              {customizingItem.addonGroups &&
                customizingItem.addonGroups
                  .filter((g) => g.options.length > 0)
                  .map((group) => {
                    const maxSelect = group.selectionType === "SINGLE" ? 1 : group.maxSelect;
                    return (
                      <div key={`addon-group-${group.id}`} className="customizer-option-group">
                        <div className="customizer-group-title">
                          <div>
                            <h3>{group.name}</h3>
                            {maxSelect && (
                              <span className="customizer-group-limits">
                                Choose up to {maxSelect} option(s)
                              </span>
                            )}
                          </div>
                          <span className={`customizer-group-badge ${group.isRequired ? "required" : ""}`}>
                            {group.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                        <div className="customizer-option-list">
                          {group.options.map((opt) => {
                            const isChecked = selectedAddons.some((a) => a.addonOptionId === opt.id);
                            const inputType = group.selectionType === "SINGLE" ? "radio" : "checkbox";
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
                                    onChange={() => handleToggleAddon(group, opt)}
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

            {customizerError && (
              <div className="customizer-addon-error" style={{ margin: "1rem" }}>
                {customizerError}
              </div>
            )}

            <div className="customizer-footer">
              <div className="customizer-stepper">
                <button
                  type="button"
                  className="customizer-stepper-button"
                  onClick={() => setCustomizerQuantity((q) => Math.max(1, q - 1))}
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
                Add Item — {formatRupees.format(customizedUnitPrice * customizerQuantity)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

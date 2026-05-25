import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  addToCart,
  addToCartAsync,
  clearError,
} from "../store/slices/cartSlice";
import { fetchMenu } from "../store/slices/menuSlice";
import { getCachedUserLocation } from "../hooks/useUserLocation";
import {
  persistRestaurantId,
  persistTableId,
  resolveRestaurantId,
  resolveTableId,
} from "../lib/tableSession";

const HARDCODED_RESTAURANT_ID = "1";
const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatDeliveryLine(delivery) {
  const distance = delivery.distanceKm != null ? `${delivery.distanceKm} km away · ` : "";
  const time = `${delivery.estimatedDeliveryTimeMinutes ?? "—"} min · `;
  const fee =
    Number(delivery.deliveryFee ?? 0) === 0
      ? "Free delivery"
      : `${formatRupees.format(delivery.deliveryFee)} delivery`;

  return `${distance}${time}${fee}`;
}

export function MenuPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const {
    items,
    loading,
    error,
    restaurantId: menuRestaurantId,
    restaurant,
    delivery,
  } = useSelector((state) => state.menu);
  const { loading: cartLoading, error: cartError } = useSelector(
    (state) => state.cart,
  );
  const isAuthenticated = useSelector((state) => !!state.auth.token);
  const [quantities, setQuantities] = useState({});
  const [cartMessage, setCartMessage] = useState("");
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState(
    HARDCODED_RESTAURANT_ID,
  );

  useEffect(() => {
    const nextRestaurantId = resolveRestaurantId(location.search) || HARDCODED_RESTAURANT_ID;
    const nextTableId = resolveTableId(location.search);

    setResolvedRestaurantId(nextRestaurantId);
    if (nextRestaurantId) {
      persistRestaurantId(nextRestaurantId);
    }
    if (nextTableId) {
      persistTableId(nextTableId);
    }
  }, [location.search]);

  useEffect(() => {
    if (resolvedRestaurantId) {
      dispatch(
        fetchMenu({
          restaurantId: Number(resolvedRestaurantId),
          coordinates: getCachedUserLocation(),
        }),
      );
    }
  }, [dispatch, resolvedRestaurantId]);

  const activeRestaurantId = useMemo(
    () =>
      menuRestaurantId ??
      (resolvedRestaurantId ? Number(resolvedRestaurantId) : null),
    [menuRestaurantId, resolvedRestaurantId],
  );

  const getQuantity = (itemId) => quantities[itemId] ?? 1;

  const updateQuantity = (itemId, nextQuantity) => {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(1, nextQuantity),
    }));
  };

  useEffect(() => {
    if (cartError) {
      setCartMessage("");
    }
  }, [cartError]);

  const handleAddToCart = async (item) => {
    const quantity = getQuantity(item.id);
    setCartMessage("");
    dispatch(clearError());

    try {
      if (isAuthenticated) {
        await dispatch(
          addToCartAsync({
            menuItemId: item.id,
            quantity,
          }),
        ).unwrap();
      } else {
        dispatch(
          addToCart({
            item,
            quantity,
          }),
        );
      }
    } catch {
      return;
    }

    setCartMessage(`${item.name} added to cart.`);

    setQuantities((current) => ({
      ...current,
      [item.id]: 1,
    }));
  };

  if (!activeRestaurantId) {
    return (
      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Restaurant not selected</h2>
            <p>
              Please open menu using a table QR that includes table and
              restaurant context.
            </p>
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
            <p className="eyebrow">Menu</p>
            <h2>Loading menu...</h2>
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
    <section>
      <div className="section-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h2>Today's favorites</h2>
          <p>{restaurant?.name ?? `Restaurant ${activeRestaurantId}`}</p>
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
              {delivery.deliveryAvailable
                ? formatDeliveryLine(delivery)
                : `${delivery.distanceKm ?? "—"} km away · ${delivery.deliveryUnavailableReason ?? delivery.reason ?? "Outside delivery range"}`}
            </span>
            {delivery.deliveryAvailable && delivery.freeDeliveryMinAmount ? (
              <span>Free delivery above {formatRupees.format(delivery.freeDeliveryMinAmount)}</span>
            ) : null}
          </div>
        ) : null}
        {cartMessage ? (
          <div className="order-status-banner success">{cartMessage}</div>
        ) : null}
        {cartError ? (
          <div className="order-status-banner error">{cartError}</div>
        ) : null}
      </div>

      <div className="menu-grid">
        {items.map((item) => (
          <article key={item.id} className="menu-card">
            <span className="pill">
              {item.category?.name || "Uncategorized"}
            </span>
            <h3>{item.name}</h3>
            <p>${item.price.toFixed(2)}</p>
            <div className="menu-card-actions">
              <div
                className="quantity-selector"
                aria-label={`Quantity for ${item.name}`}
              >
                <button
                  type="button"
                  className="quantity-button"
                  aria-label={`Decrease quantity for ${item.name}`}
                  onClick={() =>
                    updateQuantity(item.id, getQuantity(item.id) - 1)
                  }
                >
                  -
                </button>
                <span className="quantity-value">{getQuantity(item.id)}</span>
                <button
                  type="button"
                  className="quantity-button"
                  aria-label={`Increase quantity for ${item.name}`}
                  onClick={() =>
                    updateQuantity(item.id, getQuantity(item.id) + 1)
                  }
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled={cartLoading}
                onClick={() => handleAddToCart(item)}
              >
                {cartLoading ? "Adding..." : "Add to cart"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

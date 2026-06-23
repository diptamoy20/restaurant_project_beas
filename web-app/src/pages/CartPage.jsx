import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchCart,
  updateCartItemAsync,
  removeFromCartAsync,
  clearError, // newly added import for clearError action
} from "../store/slices/cartSlice";
import {
  createSessionAwarePath,
  persistRestaurantId,
  persistTableId,
  resolveRestaurantId,
  resolveTableId,
} from "../lib/tableSession";

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useSelector((state) => state.cart.items);
  const token = useSelector((state) => state.auth.token);
  const { loading: cartLoading, error: cartError } = useSelector(
    (state) => state.cart,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const cartRestaurantId = useMemo(
    () => items.find((item) => item.restaurantId)?.restaurantId ?? "",
    [items],
  );
  const tableId = resolveTableId(location.search);
  // const restaurantId = resolveRestaurantId(location.search) || cartRestaurantId;

  //better logic to determine restaurantId: if cart has items, use that restaurantId, else use the one from URL
  const urlRestaurantId = resolveRestaurantId(location.search);
  const restaurantId = items.length > 0 ? cartRestaurantId : urlRestaurantId;
  const restaurantName =
    items.find((item) => item.menuItem?.restaurant?.name)?.menuItem?.restaurant
      ?.name ||
    items.find((item) => item.restaurant?.name)?.restaurant?.name ||
    "";
  const restaurantLabel =
    restaurantName || (restaurantId ? `Restaurant #${restaurantId}` : "");
  const contextText = tableId
    ? `Ordering for Table ${tableId}${restaurantLabel ? ` at ${restaurantLabel}` : ""}`
    : restaurantLabel
      ? `Ordering from ${restaurantLabel}`
      : "Review your items before checkout. GST and coupons are calculated at checkout.";

  useEffect(() => {
    if (tableId) {
      persistTableId(tableId);
    }
  }, [tableId]);

  useEffect(() => {
    if (restaurantId) {
      persistRestaurantId(restaurantId);
    }
  }, [restaurantId]);

  // useEffect(() => {
  //   dispatch(fetchCart());
  // }, [dispatch]);

useEffect(() => {
  dispatch(clearError());
  setErrorMessage('');
  dispatch(fetchCart());
}, [dispatch]);

useEffect(() => {
  dispatch(clearError());
  setErrorMessage('');
}, [restaurantId]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items],
  );

  const increaseQuantity = (item) => {
    // dispatch(increaseQuantityAction(item.cartKey));
    dispatch(
      updateCartItemAsync({
        cartItemId: item.cartItemId,
        quantity: item.quantity + 1,
      }),
    );
  };

  //   const decreaseQuantity = (item) => {
  //     // dispatch(decreaseQuantityAction(item.cartKey));
  //     dispatch(
  //  updateCartItemAsync({
  //    cartItemId:item.cartItemId,
  //    quantity:item.quantity-1,
  //  })
  // );
  //   };

  const decreaseQuantity = async (item) => {
    try {
      // If quantity is already 1 → remove item
      if (item.quantity <= 1) {
        await dispatch(removeFromCartAsync(item.cartItemId)).unwrap();

        return;
      }

      // Otherwise decrease normally
      await dispatch(
        updateCartItemAsync({
          cartItemId: item.cartItemId,
          quantity: item.quantity - 1,
        }),
      ).unwrap();
    } catch (error) {
      setErrorMessage(error?.message || "Unable to update cart.");
    }
  };

  const removeItem = (item) => {
    // dispatch(removeItemAction(item.cartKey));
    dispatch(removeFromCartAsync(item.cartItemId));
  };

  const proceedToCheckout = async () => {
    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage(
        "Your cart is empty. Add at least one item before checkout.",
      );
      return;
    }

    const checkoutPath = createSessionAwarePath(
      "/checkout",
      tableId,
      restaurantId,
    );
    const [checkoutPathname, checkoutSearch = ""] = checkoutPath.split("?");

    if (!token) {
      navigate("/login", {
        state: {
          from: {
            pathname: checkoutPathname,
            search: checkoutSearch ? `?${checkoutSearch}` : "",
          },
        },
      });
      return;
    }

    try {
      // Reload cart to verify with actual backend state
      const result = await dispatch(fetchCart()).unwrap();
      const latestItems = result?.cartItems || [];

      if (latestItems.length === 0) {
        setErrorMessage("Your cart is empty.");
        return;
      }

      // Check if items from multiple restaurants are mixed
      const uniqueRestaurantIds = [
        ...new Set(
          latestItems.map((item) => item.restaurantId).filter(Boolean),
        ),
      ];
      if (uniqueRestaurantIds.length > 1) {
        setErrorMessage(
          "Cart contains items from different restaurants. Please clear cart and retry.",
        );
        return;
      }

      const cartRestId = latestItems[0]?.restaurantId;
      const targetRestaurantId = restaurantId || cartRestId;

      if (!targetRestaurantId) {
        setErrorMessage(
          "Restaurant context is missing. Please scan table QR and open menu again.",
        );
        return;
      }

      // If the current restaurant ID doesn't match the items in the cart, block
      if (
        latestItems.some(
          (item) => String(item.restaurantId) !== String(targetRestaurantId),
        )
      ) {
        setErrorMessage(
          "Cart contains items from a different restaurant. Please clear cart and retry.",
        );
        return;
      }

      const finalPath = createSessionAwarePath(
        "/checkout",
        tableId,
        targetRestaurantId,
      );
      navigate(finalPath);
    } catch (error) {
      setErrorMessage(
        error.message || "Failed to verify cart status. Please try again.",
      );
    }
  };

  return (
    <section className="cart-page">
      <div className="section-header cart-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h2>Your order summary</h2>
          <p className="cart-supporting-copy">{contextText}</p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="stack cart-items-stack">
          {items.length === 0 ? (
            <div className="empty-state">Your cart is empty.</div>
          ) : (
            items.map((item) => {
              const itemSubtotal = item.price;

              return (
                <article key={item.cartKey} className="cart-item-card">
                  <div className="cart-item-main">
                    <div>
                      <span className="pill">{item.category?.name}</span>
                      <h3>{item.name}</h3>
                      <p className="line-item-meta">
                        {formatCurrency.format(item.unitPrice)} per item
                      </p>
                      {(item.variant ||
                        (item.addOns && item.addOns.length > 0)) && (
                        <div className="cart-item-customizations">
                          {item.variant && (
                            <span>Size: {item.variant.name}</span>
                          )}
                          {(item.addOns ?? []).map((addon) => (
                            <span
                              key={`cart-addon-${item.cartKey}-${addon.addonOptionId}`}
                            >
                              + {addon.addonOptionName || addon.name} (+{" "}
                              {formatCurrency.format(addon.price)})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cart-remove-button"
                      onClick={() => removeItem(item)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="cart-item-footer">
                    <div
                      className="quantity-selector"
                      aria-label={`Quantity for ${item.name}`}
                    >
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Decrease quantity for ${item.name}`}
                        onClick={() => decreaseQuantity(item)}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Increase quantity for ${item.name}`}
                        onClick={() => increaseQuantity(item)}
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item-total">
                      <span>Subtotal</span>
                      <strong>{formatCurrency.format(itemSubtotal)}</strong>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="cart-summary-card">
          <div className="cart-summary-rows">
            <div className="total-row">
              <span>Subtotal</span>
              <strong>{formatCurrency.format(subtotal)}</strong>
            </div>
            <div className="total-row total-row-highlighted">
              <span>Estimated Total</span>
              <strong>{formatCurrency.format(subtotal)}</strong>
            </div>
            <p className="cart-tax-note">
              GST, coupons, and payable total are calculated on checkout.
            </p>
          </div>

          {errorMessage || cartError ? (
            <div className="order-status-banner error">
              {errorMessage || cartError}
            </div>
          ) : null}

          <button
            type="button"
            className="place-order-button"
            disabled={cartLoading || items.length === 0}
            onClick={proceedToCheckout}
          >
            Proceed to checkout
          </button>
        </aside>
      </div>
    </section>
  );
}

export function calculateTotal(subtotal, taxesAndFees = 0) {
  return subtotal + taxesAndFees;
}

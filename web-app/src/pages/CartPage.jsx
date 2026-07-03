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
import { fetchAddresses } from "../store/slices/addressSlice";
import { checkoutApi } from "../services/checkoutApi";

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/** Renders a single bill row. Hidden when value is null/undefined/0 and hideZero=true */
function BillRow({ label, value, isDiscount = false, isMuted = false, isPayable = false, hideZero = true, prefix = "" }) {
  if (hideZero && (value == null || Number(value) === 0)) return null;
  const className = [
    "bill-row",
    isDiscount ? "bill-row-discount" : "",
    isMuted ? "bill-row-muted" : "",
    isPayable ? "bill-row-payable" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <span>{label}</span>
      <i aria-hidden="true" />
      <strong>
        {isDiscount ? "-" : prefix}
        {formatCurrency.format(Math.abs(Number(value)))}
      </strong>
    </div>
  );
}

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
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const addresses = useSelector((state) => state.addresses?.items) || [];
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

  // Fetch addresses if delivery order and authenticated
  useEffect(() => {
    if (token && !tableId) {
      dispatch(fetchAddresses());
    }
  }, [dispatch, token, tableId]);

  const defaultAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((addr) => addr.isDefault) ?? addresses[0];
  }, [addresses]);

  // Calculate cart quote dynamically from backend
  useEffect(() => {
    if (!token || !items.length || !restaurantId) {
      setQuote(null);
      return;
    }
    if (!tableId && !defaultAddress) {
      setQuote(null);
      return;
    }

    let isMounted = true;
    const fetchCartQuote = async () => {
      setQuoteLoading(true);
      try {
        const payload = {
          restaurantId: Number(restaurantId),
          orderType: tableId ? "DINE_IN" : "DELIVERY",
          addressId: !tableId && defaultAddress ? Number(defaultAddress.id) : undefined,
          items: items.map((item) => ({
            menuItemId: item.menuItemId || item.id,
            variantId: item.variantId || undefined,
            quantity: item.quantity,
            addons: (item.addOns ?? item.addons ?? [])
              .map((addon) => ({
                addonGroupId: Number(addon.addonGroupId),
                addonOptionId: Number(addon.addonOptionId ?? addon.id),
              }))
              .filter(
                (addon) =>
                  Number.isInteger(addon.addonGroupId) &&
                  addon.addonGroupId > 0 &&
                  Number.isInteger(addon.addonOptionId) &&
                  addon.addonOptionId > 0,
              ),
          })),
        };
        const nextQuote = await checkoutApi.getQuote(payload);
        if (isMounted) {
          setQuote(nextQuote);
        }
      } catch (err) {
        console.error("Cart quote calculation failed:", err);
        if (isMounted) {
          setQuote(null);
        }
      } finally {
        if (isMounted) {
          setQuoteLoading(false);
        }
      }
    };

    fetchCartQuote();

    return () => {
      isMounted = false;
    };
  }, [token, items, restaurantId, tableId, defaultAddress]);

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
          <h3 className="cart-summary-heading">Order summary</h3>
          <div className="cart-summary-rows">
            {/* Per-item lines */}
            {items.map((item) => (
              <div key={item.cartKey} className="bill-row bill-row-muted">
                <span>
                  {item.name}
                  {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </span>
                <i aria-hidden="true" />
                <strong>{formatCurrency.format(item.price)}</strong>
              </div>
            ))}

            {/* Divider */}
            {items.length > 0 && <hr className="cart-summary-divider" />}

            {quote ? (
              <>
                {/* Items subtotal */}
                <BillRow label="Items total" value={quote.subtotalAmount ?? subtotal} hideZero={false} />

                {/* Menu / item-level discount */}
                <BillRow label="Item discount" value={quote.menuDiscountAmount} isDiscount />

                {/* Coupon discount */}
                <BillRow
                  label={quote.couponDiscountAmount > 0 ? `Coupon${quote.couponCode ? ` (${quote.couponCode})` : ""}` : "Coupon"}
                  value={quote.couponDiscountAmount}
                  isDiscount
                />

                {/* Manual discount */}
                <BillRow label="Discount" value={quote.manualDiscountAmount} isDiscount />

                {/* Delivery charge */}
                {quote.deliveryCharge != null && (
                  <div className="bill-row">
                    <span>Delivery</span>
                    <i aria-hidden="true" />
                    <strong>
                      {Number(quote.deliveryCharge) === 0
                        ? "Free"
                        : formatCurrency.format(quote.deliveryCharge)}
                    </strong>
                  </div>
                )}

                {/* Packaging charge */}
                <BillRow label="Packaging" value={quote.packagingCharge} />

                {/* Tip */}
                <BillRow label="Tip" value={quote.tipAmount} />

                {/* Taxes with breakdown */}
                {Number(quote.taxAmount) > 0 && (
                  <>
                    <BillRow label="Taxes" value={quote.taxAmount} hideZero={false} />
                    <div className="bill-tax-breakup">
                      {Number(quote.cgstAmount) > 0 && (
                        <BillRow
                          label={`CGST${quote.gstRate ? ` (${Number(quote.gstRate) / 2}%)` : ""}`}
                          value={quote.cgstAmount}
                          isMuted
                        />
                      )}
                      {Number(quote.sgstAmount) > 0 && (
                        <BillRow
                          label={`SGST${quote.gstRate ? ` (${Number(quote.gstRate) / 2}%)` : ""}`}
                          value={quote.sgstAmount}
                          isMuted
                        />
                      )}
                      {Number(quote.igstAmount) > 0 && (
                        <BillRow
                          label={`IGST${quote.gstRate ? ` (${quote.gstRate}%)` : ""}`}
                          value={quote.igstAmount}
                          isMuted
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Platform fee */}
                <BillRow label="Platform fee" value={quote.platformFee} />

                {/* Divider */}
                <hr className="cart-summary-divider" />

                {/* Final Payable Amount */}
                <BillRow label="Payable" value={quote.finalAmount} isPayable hideZero={false} />
              </>
            ) : (
              <>
                <BillRow label="Items total" value={subtotal} hideZero={false} />
                <div className="cart-summary-notice">
                  <p className="cart-tax-note">
                    ✓ Items total shown above<br/>
                    • Delivery charges calculated at checkout<br/>
                    • Packaging charges based on items<br/>
                    • GST/Taxes calculated with delivery address<br/>
                    • Coupon discounts applied at checkout<br/>
                    • Final payable amount confirmed before payment
                  </p>
                </div>
              </>
            )}
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

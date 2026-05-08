import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  decreaseQuantity as decreaseQuantityAction,
  increaseQuantity as increaseQuantityAction,
  removeItem as removeItemAction,
  removeFromCartAsync,
  updateCartItemAsync,
} from '../store/slices/cartSlice';
import {
  createSessionAwarePath,
  persistRestaurantId,
  persistTableId,
} from '../lib/tableSession';

const TAXES_AND_FEES = 0;
const HARDCODED_RESTAURANT_ID = '1';
const HARDCODED_TABLE_ID = '1';

export function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const token = useSelector((state) => state.auth.token);
  const { loading: cartLoading, error: cartError } = useSelector((state) => state.cart);
  const [errorMessage, setErrorMessage] = useState('');
  // Temporarily hardcoded for local testing.
  // Dynamic URL/session/cart-based restaurant-table resolution is intentionally disabled.
  const tableId = HARDCODED_TABLE_ID;
  const restaurantId = HARDCODED_RESTAURANT_ID;

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

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const totalAmount = calculateTotal(subtotal, TAXES_AND_FEES);

  const increaseQuantity = (item) => {
    const itemId = item.menuItemId || item.id;
    const nextQuantity = item.quantity + 1;

    dispatch(increaseQuantityAction(itemId));

    if (token) {
      dispatch(updateCartItemAsync({ menuItemId: itemId, payload: { quantity: nextQuantity } }));
    }
  };

  const decreaseQuantity = (item) => {
    const itemId = item.menuItemId || item.id;
    const nextQuantity = item.quantity - 1;

    dispatch(decreaseQuantityAction(itemId));

    if (token) {
      if (nextQuantity <= 0) {
        dispatch(removeFromCartAsync(itemId));
      } else {
        dispatch(updateCartItemAsync({ menuItemId: itemId, payload: { quantity: nextQuantity } }));
      }
    }
  };

  const removeItem = (item) => {
    const itemId = item.menuItemId || item.id;

    dispatch(removeItemAction(itemId));

    if (token) {
      dispatch(removeFromCartAsync(itemId));
    }
  };

  const proceedToCheckout = () => {
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Add at least one item before checkout.');
      return;
    }

    if (!restaurantId) {
      setErrorMessage('Restaurant context is missing. Please scan table QR and open menu again.');
      return;
    }

    if (items.some((item) => String(item.restaurantId) !== String(restaurantId))) {
      setErrorMessage('Cart contains items from a different restaurant. Please clear cart and retry.');
      return;
    }

    navigate(createSessionAwarePath('/checkout', tableId, restaurantId));
  };

  return (
    <section className="cart-page">
      <div className="section-header cart-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h2>Your order summary</h2>
          <p className="cart-supporting-copy">
            {tableId
              ? `Ordering for table ${tableId} at restaurant ${restaurantId || 'N/A'}`
              : 'Review your items before placing the order.'}
          </p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="stack cart-items-stack">
          {items.length === 0 ? (
            <div className="empty-state">Your cart is empty.</div>
          ) : (
            !!items && items.map((item) => {
              const itemSubtotal = item.price * item.quantity;

              return (
                <article key={item.id || item.menuItemId} className="cart-item-card">
                  <div className="cart-item-main">
                    <div>
                      <span className="pill">{item.category?.name}</span>
                      <h3>{item.name}</h3>
                      <p className="line-item-meta">${item.price.toFixed(2)} per item</p>
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
                    <div className="quantity-selector" aria-label={`Quantity for ${item.name}`}>
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
                      <strong>${itemSubtotal.toFixed(2)}</strong>
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
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            <div className="total-row">
              <span>Taxes & fees</span>
              <strong>${TAXES_AND_FEES.toFixed(2)}</strong>
            </div>
            <div className="total-row total-row-highlighted">
              <span>Final Total</span>
              <strong>${totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          {errorMessage || cartError ? (
            <div className="order-status-banner error">{errorMessage || cartError}</div>
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

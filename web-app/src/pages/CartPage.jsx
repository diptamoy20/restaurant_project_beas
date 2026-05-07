import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clearCart,
  decreaseQuantity as decreaseQuantityAction,
  increaseQuantity as increaseQuantityAction,
  removeItem as removeItemAction,
  setLastOrderId,
} from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';
import {
  createSessionAwarePath,
  persistRestaurantId,
  persistTableId,
} from '../lib/tableSession';

const TAXES_AND_FEES = 0;
const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';
const HARDCODED_RESTAURANT_ID = '1';
const HARDCODED_TABLE_ID = '1';

export function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart.items);
  const user = useSelector((state) => state.auth.user);
  const { loading: orderLoading, error: orderError } = useSelector((state) => state.orders);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
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

  useEffect(() => {
    if (orderError) {
      setErrorMessage(orderError);
      setPlacingOrder(false);
    }
  }, [orderError]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const totalAmount = calculateTotal(subtotal, TAXES_AND_FEES);

  const increaseQuantity = (itemId) => {
    dispatch(increaseQuantityAction(itemId));
  };

  const decreaseQuantity = (itemId) => {
    dispatch(decreaseQuantityAction(itemId));
  };

  const removeItem = (itemId) => {
    dispatch(removeItemAction(itemId));
  };

  const placeOrder = async () => {
    setErrorMessage('');
    setStatusMessage('');

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Add at least one item before placing an order.');
      return;
    }

    if (!user) {
      setErrorMessage('Please sign in before placing an order.');
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

    setPlacingOrder(true);

    const payload = {
      userId: user.id,
      restaurantId: Number(restaurantId),
      tableId: tableId ? Number(tableId) : undefined,
      orderType: tableId ? 'DINE_IN' : 'TAKEAWAY',
      discountAmount: 0,
      items: items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    try {
      const result = await dispatch(createOrder(payload)).unwrap();

      dispatch(setLastOrderId(result.id));
      dispatch(clearCart());
      sessionStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId: result.id,
          tableId: result.tableId,
          totalAmount: result.finalAmount,
          paymentStatus: result.paymentStatus,
        }),
      );
      setStatusMessage('Order placed successfully. Redirecting to payment...');
      setTimeout(() => {
        navigate(createSessionAwarePath(`/payment/${result.id}`, tableId, restaurantId));
      }, 1000);
    } catch (error) {
      setErrorMessage(error || 'Unable to place order right now.');
      setPlacingOrder(false);
    }
  };

  console.log(items, 'items');

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
                      onClick={() => removeItem(item.id || item.menuItemId)}
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
                        onClick={() => decreaseQuantity(item.id || item.menuItemId)}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Increase quantity for ${item.name}`}
                        onClick={() => increaseQuantity(item.id || item.menuItemId)}
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

          {statusMessage ? <div className="order-status-banner success">{statusMessage}</div> : null}
          {errorMessage ? <div className="order-status-banner error">{errorMessage}</div> : null}

          <button
            type="button"
            className="place-order-button"
            disabled={placingOrder || orderLoading || items.length === 0}
            onClick={placeOrder}
          >
            {placingOrder || orderLoading ? 'Placing order...' : 'Place Order'}
          </button>
        </aside>
      </div>
    </section>
  );
}

export function calculateTotal(subtotal, taxesAndFees = 0) {
  return subtotal + taxesAndFees;
}

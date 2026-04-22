import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  clearCart,
  decreaseQuantity as decreaseQuantityAction,
  increaseQuantity as increaseQuantityAction,
  removeItem as removeItemAction,
  setLastOrderId,
} from '../store/slices/cartSlice';
import { api } from '../lib/api';
import { createTableAwarePath, persistTableId, resolveTableId } from '../lib/tableSession';

const DEFAULT_RESTAURANT_ID = 1;
const TAXES_AND_FEES = 0;
const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';

export function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useSelector((state) => state.cart.items);
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const tableId = resolveTableId(location.search);

  useEffect(() => {
    if (tableId) {
      persistTableId(tableId);
    }
  }, [tableId]);

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

    if (!token || !user) {
      setErrorMessage('Please sign in before placing an order.');
      return;
    }

    setPlacingOrder(true);

    const order = {
      tableId: tableId ? Number(tableId) : null,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };

    const payload = {
      userId: user.id,
      restaurantId: DEFAULT_RESTAURANT_ID,
      tableId: order.tableId ?? undefined,
      orderType: order.tableId ? 'DINE_IN' : 'TAKEAWAY',
      items: items.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    try {
      const response = await api.post('/orders', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderId = response.id;

      dispatch(setLastOrderId(orderId));
      dispatch(clearCart());
      sessionStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId,
          tableId: response.tableId ?? order.tableId,
          orderNumber: response.orderNumber,
          totalAmount: response.finalAmount ?? order.totalAmount,
          paymentStatus: response.paymentStatus ?? order.paymentStatus,
          status: response.status,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
        }),
      );
      setStatusMessage('Order placed successfully. Redirecting to payment...');
      navigate(createTableAwarePath(`/payment/${orderId}`, tableId));
    } catch (error) {
      setErrorMessage(error.message || 'Unable to place order right now.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section className="cart-page">
      <div className="section-header cart-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h2>Your order summary</h2>
          <p className="cart-supporting-copy">
            {tableId ? `Ordering for table ${tableId}` : 'Review your items before placing the order.'}
          </p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="stack cart-items-stack">
          {items.length === 0 ? (
            <div className="empty-state">Your cart is empty.</div>
          ) : (
            items.map((item) => {
              const itemSubtotal = item.price * item.quantity;

              return (
                <article key={item.id} className="cart-item-card">
                  <div className="cart-item-main">
                    <div>
                      <span className="pill">{item.category}</span>
                      <h3>{item.name}</h3>
                      <p className="line-item-meta">${item.price.toFixed(2)} per item</p>
                    </div>
                    <button
                      type="button"
                      className="cart-remove-button"
                      onClick={() => removeItem(item.id)}
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
                        onClick={() => decreaseQuantity(item.id)}
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-button"
                        aria-label={`Increase quantity for ${item.name}`}
                        onClick={() => increaseQuantity(item.id)}
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
            disabled={placingOrder || items.length === 0}
            onClick={placeOrder}
          >
            {placingOrder ? 'Placing order...' : 'Place Order'}
          </button>
        </aside>
      </div>
    </section>
  );
}

export function calculateTotal(subtotal, taxesAndFees = 0) {
  return subtotal + taxesAndFees;
}

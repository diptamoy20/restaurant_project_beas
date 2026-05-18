import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckoutAddressPicker } from '../components/checkout/CheckoutAddressPicker.jsx';
import { useRazorpayPayment } from '../hooks/useRazorpayPayment';
import {
  createSessionAwarePath,
  resolveRestaurantId,
  resolveTableId,
} from '../lib/tableSession';
import { clearCart, setLastOrderId } from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';
const TAXES_AND_FEES = 0;
const HARDCODED_RESTAURANT_ID = '1';
const HARDCODED_TABLE_ID = '1';

export function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useSelector((state) => state.cart.items);
  const user = useSelector((state) => state.auth.user);
  const orderLoading = useSelector((state) => state.orders.loading);
  const { startRazorpayPayment } = useRazorpayPayment();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const tableId = resolveTableId(location.search) || HARDCODED_TABLE_ID;
  const restaurantId = resolveRestaurantId(location.search) || HARDCODED_RESTAURANT_ID;
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const totalAmount = subtotal + TAXES_AND_FEES;
  const isSubmitting = orderLoading || isPaying;

  const submitCheckout = async () => {
    setErrorMessage('');
    setStatusMessage('');

    if (!user) {
      // Redirect to login so user can authenticate and return to checkout
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (items.some((item) => String(item.restaurantId) !== String(restaurantId))) {
      setErrorMessage('Cart contains items from a different restaurant. Please clear cart and retry.');
      return;
    }

    if (!selectedAddressId) {
      setErrorMessage('Please select or add a delivery address before checkout.');
      return;
    }

    const orderPayload = {
      userId: user.id,
      restaurantId: Number(restaurantId),
      tableId: tableId ? Number(tableId) : undefined,
      addressId: Number(selectedAddressId),
      orderType: tableId ? 'DINE_IN' : 'TAKEAWAY',
      discountAmount: 0,
      items: items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    try {
      setIsPaying(true);
      setStatusMessage('Creating your order...');
      const order = await dispatch(createOrder(orderPayload)).unwrap();

      setStatusMessage('Opening secure payment...');
      await startRazorpayPayment({
        order,
        user,
        onSuccess: () => setStatusMessage('Payment successful. Finalizing order...'),
        onFailure: (message) => setErrorMessage(message),
      });

      dispatch(setLastOrderId(order.id));
      dispatch(clearCart());
      sessionStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId: order.id,
          tableId: order.tableId,
          addressId: order.addressId,
          totalAmount: order.finalAmount,
          paymentStatus: 'PAID',
          paymentMethod: 'RAZORPAY',
          customerNote,
        }),
      );
      setStatusMessage('Checkout complete. Redirecting...');
      navigate(createSessionAwarePath(`/payment/${order.id}`, tableId, restaurantId), {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(error?.message || error || 'Unable to complete checkout right now.');
      setStatusMessage('');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <section className="checkout-page">
      <div className="section-header checkout-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Confirm order</h2>
          <p className="cart-supporting-copy">
            Table {tableId || 'N/A'} - Restaurant {restaurantId}
          </p>
        </div>
        <Link className="text-link" to={createSessionAwarePath('/cart', tableId, restaurantId)}>
          Edit cart
        </Link>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-panel">
            <div className="checkout-panel-header">
              <span className="checkout-step">1</span>
              <div>
                <h3>Customer</h3>
                <p>{user?.name || user?.email || 'Customer'}</p>
              </div>
            </div>
            <div className="checkout-detail-grid">
              <div>
                <span>Order type</span>
                <strong>{tableId ? 'Dine in' : 'Takeaway'}</strong>
              </div>
              <div>
                <span>Items</span>
                <strong>{items.length}</strong>
              </div>
            </div>
          </div>

          <div className="checkout-panel">
            <div className="checkout-panel-header">
              <span className="checkout-step">2</span>
              <div>
                <h3>Delivery address</h3>
                <p>Select a saved address or add a new one.</p>
              </div>
            </div>
            <CheckoutAddressPicker
              selectedAddressId={selectedAddressId}
              onSelectAddress={setSelectedAddressId}
            />
          </div>

          <div className="checkout-panel">
            <div className="checkout-panel-header">
              <span className="checkout-step">3</span>
              <div>
                <h3>Kitchen note</h3>
                <p>Optional instructions for this order.</p>
              </div>
            </div>
            <textarea
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              maxLength={160}
              placeholder="Example: less spicy, no onion"
            />
          </div>
        </div>

        <aside className="checkout-summary-card">
          <h3>Order summary</h3>
          <div className="checkout-line-items">
            {items.length === 0 ? (
              <div className="empty-state">Your cart is empty.</div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.menuItemId || item.id}-${item.variantId || 'base'}`}
                  className="checkout-line-item"
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.quantity} x ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))
            )}
          </div>

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
              <span>Payable</span>
              <strong>${totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          {statusMessage ? <div className="order-status-banner success">{statusMessage}</div> : null}
          {errorMessage ? <div className="order-status-banner error">{errorMessage}</div> : null}

          {!user ? (
            <div className="checkout-auth-cta">
              <p>Please sign in to complete checkout.</p>
              <div className="checkout-auth-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate('/login', { state: { from: location } })}
                >
                  Login
                </button>
                <button
                  type="button"
                  className="cta-button cta-button-primary"
                  onClick={() => navigate('/register', { state: { from: location } })}
                >
                  Register
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="place-order-button"
              disabled={isSubmitting || items.length === 0}
              onClick={submitCheckout}
            >
              {isSubmitting ? 'Processing...' : 'Confirm checkout'}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}

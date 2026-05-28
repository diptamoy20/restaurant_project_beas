import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckoutAddressPicker } from '../components/checkout/CheckoutAddressPicker.jsx';
import { useRazorpayPayment } from '../hooks/useRazorpayPayment';
import { checkoutApi } from '../services/checkoutApi';
import { paymentApi } from '../services/paymentApi';
import {
  createSessionAwarePath,
  resolveRestaurantId,
  resolveTableId,
} from '../lib/tableSession';
import { clearCart, setLastOrderId } from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';

const LAST_ORDER_STORAGE_KEY = 'restaurant-web-last-order';
const formatCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

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
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponListLoading, setCouponListLoading] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');

  const cartRestaurantId = useMemo(
    () => items.find((item) => item.restaurantId)?.restaurantId ?? '',
    [items],
  );
  const tableId = resolveTableId(location.search);
  const restaurantId = resolveRestaurantId(location.search) || cartRestaurantId;
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const totalAmount = quote?.finalAmount ?? subtotal;
  const tipAmount = useMemo(() => {
    const value = Number(tipInput);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [tipInput]);
  const isSubmitting = orderLoading || isPaying || quoteLoading;

  const buildQuotePayload = useCallback(
    (couponCode = appliedCouponCode) => ({
      restaurantId: Number(restaurantId),
      addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
      orderType: 'DELIVERY',
      couponCode: couponCode || undefined,
      tipAmount,
      items: items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        addons: item.addons,
      })),
    }),
    [appliedCouponCode, items, restaurantId, selectedAddressId, tipAmount],
  );

  const refreshQuote = useCallback(
    async (couponCode = appliedCouponCode) => {
      if (!user || !items.length || !restaurantId || !selectedAddressId) {
        setQuote(null);
        return null;
      }

      setQuoteLoading(true);
      try {
        const nextQuote = await checkoutApi.getQuote(buildQuotePayload(couponCode));
        setQuote(nextQuote);
        setErrorMessage('');
        return nextQuote;
      } catch (error) {
        setQuote(null);
        setErrorMessage(error?.message || 'Unable to calculate checkout total.');
        return null;
      } finally {
        setQuoteLoading(false);
      }
    },
    [appliedCouponCode, buildQuotePayload, items.length, restaurantId, selectedAddressId, user],
  );

  useEffect(() => {
    if (user && items.length) {
      void refreshQuote(appliedCouponCode);
    } else {
      setQuote(null);
    }
  }, [appliedCouponCode, items, refreshQuote, selectedAddressId, tipAmount, user]);

  const applyCoupon = async () => {
    const nextCode = couponInput.trim().toUpperCase();
    if (!nextCode) {
      setErrorMessage('Enter a coupon code.');
      return;
    }

    const nextQuote = await refreshQuote(nextCode);
    if (nextQuote) {
      setAppliedCouponCode(nextCode);
      setCouponInput(nextCode);
      setStatusMessage('Coupon applied.');
    }
  };

  const applyAvailableCoupon = async (code, closeDialog = false) => {
    setCouponInput(code);
    const nextQuote = await refreshQuote(code);
    if (nextQuote) {
      setAppliedCouponCode(code);
      setStatusMessage('Coupon applied.');
      if (closeDialog) {
        setCouponDialogOpen(false);
      }
    }
  };

  const removeCoupon = () => {
    setAppliedCouponCode('');
    setCouponInput('');
    setStatusMessage('');
  };

  useEffect(() => {
    if (!user || !items.length || !restaurantId) {
      setAvailableCoupons([]);
      return undefined;
    }

    const controller = new AbortController();

    async function loadCoupons() {
      setCouponListLoading(true);
      try {
        const coupons = await checkoutApi.getCoupons({
          restaurantId,
          subtotalAmount: quote?.subtotalAmount ?? subtotal,
        });
        if (!controller.signal.aborted) {
          setAvailableCoupons(Array.isArray(coupons) ? coupons : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setAvailableCoupons([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCouponListLoading(false);
        }
      }
    }

    void loadCoupons();

    return () => controller.abort();
  }, [items.length, quote?.subtotalAmount, restaurantId, subtotal, user]);

  const sortedCoupons = useMemo(
    () =>
      [...availableCoupons].sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          (b.estimatedDiscount ?? 0) - (a.estimatedDiscount ?? 0),
      ),
    [availableCoupons],
  );
  const previewCoupons = sortedCoupons.slice(0, 2);

  const renderCouponCard = (coupon, index, closeDialog = false) => (
    <div
      className={coupon.eligible ? 'checkout-offer-card' : 'checkout-offer-card is-disabled'}
      key={coupon.id}
    >
      <div>
        <div className="checkout-offer-title">
          <strong>{coupon.code}</strong>
          {index === 0 && coupon.eligible ? <span>Best offer</span> : null}
        </div>
        <p>
          {coupon.discountType === 'PERCENTAGE'
            ? `${coupon.discountValue}% off${coupon.maxDiscountAmount ? ` up to ${formatCurrency.format(coupon.maxDiscountAmount)}` : ''}`
            : `${formatCurrency.format(coupon.discountValue)} off`}
        </p>
        {coupon.minOrderAmount ? (
          <small>Min order {formatCurrency.format(coupon.minOrderAmount)}</small>
        ) : null}
        {!coupon.eligible && coupon.reason ? <small>{coupon.reason}</small> : null}
      </div>
      <button
        type="button"
        className="text-link"
        disabled={!coupon.eligible || appliedCouponCode === coupon.code || quoteLoading}
        onClick={() => applyAvailableCoupon(coupon.code, closeDialog)}
      >
        {appliedCouponCode === coupon.code ? 'Applied' : 'Apply'}
      </button>
    </div>
  );

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

    if (!restaurantId) {
      setErrorMessage('Restaurant context is missing. Please open menu again.');
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

    if (tipInput && (!Number.isFinite(Number(tipInput)) || Number(tipInput) < 0)) {
      setErrorMessage('Enter a valid tip amount.');
      return;
    }

    const orderPayload = {
      userId: user.id,
      restaurantId: Number(restaurantId),
      tableId: tableId ? Number(tableId) : undefined,
      addressId: Number(selectedAddressId),
      orderType: 'DELIVERY',
      couponCode: appliedCouponCode || undefined,
      tipAmount,
      paymentMethod,
      items: items.map((item) => ({
        menuItemId: item.menuItemId || item.id,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        price: item.price,
        addons: (item.addOns ?? []).map((addon) => ({
          addonGroupId: addon.addonGroupId,
          addonOptionId: addon.addonOptionId,
        })),
      })),
    };

    try {
      setIsPaying(true);
      setStatusMessage('Creating your order...');
      const order = await dispatch(createOrder(orderPayload)).unwrap();

      if (paymentMethod === 'COD') {
        setStatusMessage('Confirming cash on delivery...');
        await paymentApi.confirmCodPayment(order.id);
      } else {
        setStatusMessage('Opening secure payment...');
        await startRazorpayPayment({
          order,
          user,
          onSuccess: () => setStatusMessage('Payment successful. Finalizing order...'),
          onFailure: (message) => setErrorMessage(message),
        });
      }

      dispatch(setLastOrderId(order.id));
      dispatch(clearCart());
      sessionStorage.setItem(
        LAST_ORDER_STORAGE_KEY,
        JSON.stringify({
          orderId: order.id,
          tableId: order.tableId,
          addressId: order.addressId,
          totalAmount: order.finalAmount,
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
          paymentMethod,
          customerNote,
          tipAmount,
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
                    <span>{item.quantity} x {formatCurrency.format(item.price)}</span>
                  </div>
                  <strong>{formatCurrency.format(item.price * item.quantity)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="checkout-coupon-row">
            <div>
              <strong>Coupon</strong>
              <span>{appliedCouponCode ? `${appliedCouponCode} applied` : 'Apply discount code'}</span>
            </div>
            <div className="checkout-coupon-actions">
              <input
                className="coupon-input"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                placeholder="WELCOME50"
              />
              <button type="button" className="ghost-button" disabled={quoteLoading} onClick={applyCoupon}>
                Apply
              </button>
              {appliedCouponCode ? (
                <button type="button" className="ghost-button" onClick={removeCoupon}>
                  Remove
                </button>
              ) : null}
            </div>
            {couponListLoading ? (
              <p className="checkout-offer-hint">Checking available coupons...</p>
            ) : null}
            {availableCoupons.length ? (
              <div className="checkout-offer-list">
                {previewCoupons.map((coupon, index) => renderCouponCard(coupon, index))}
                {sortedCoupons.length > previewCoupons.length ? (
                  <button
                    type="button"
                    className="checkout-view-offers"
                    onClick={() => setCouponDialogOpen(true)}
                  >
                    View all offers ({sortedCoupons.length})
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="checkout-coupon-row">
            <div>
              <strong>Tip</strong>
              <span>Optional amount for the restaurant team</span>
            </div>
            <div className="checkout-coupon-actions">
              {[20, 50, 100].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="ghost-button"
                  onClick={() => setTipInput(String(amount))}
                >
                  {formatCurrency.format(amount)}
                </button>
              ))}
              <input
                className="coupon-input"
                min="0"
                value={tipInput}
                onChange={(event) => setTipInput(event.target.value)}
                placeholder="Custom"
                type="number"
              />
              {tipInput ? (
                <button type="button" className="ghost-button" onClick={() => setTipInput('')}>
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="checkout-coupon-row">
            <div>
              <strong>Payment method</strong>
              <span>{paymentMethod === 'COD' ? 'Pay by cash on delivery' : 'Pay online securely'}</span>
            </div>
            <div className="checkout-coupon-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                disabled={paymentMethod === 'RAZORPAY'}
              >
                Online
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPaymentMethod('COD')}
                disabled={paymentMethod === 'COD'}
              >
                COD
              </button>
            </div>
          </div>

          <div className="bill-summary-rows">
            <div className="bill-row">
              <span>Item total</span>
              <i aria-hidden="true" />
              <strong>{formatCurrency.format(quote?.subtotalAmount ?? subtotal)}</strong>
            </div>
            {quote?.couponDiscountAmount ? (
              <div className="bill-row bill-row-discount">
                <span>Coupon</span>
                <i aria-hidden="true" />
                <strong>-{formatCurrency.format(quote.couponDiscountAmount)}</strong>
              </div>
            ) : null}
            <div className="bill-row">
              <span>Taxes</span>
              <i aria-hidden="true" />
              <strong>{formatCurrency.format(quote?.taxAmount ?? 0)}</strong>
            </div>
            {quote?.deliveryCharge != null ? (
              <div className="bill-row">
                <span>Delivery</span>
                <i aria-hidden="true" />
                <strong>
                  {Number(quote.deliveryCharge) === 0
                    ? 'Free'
                    : formatCurrency.format(quote.deliveryCharge)}
                </strong>
              </div>
            ) : null}
            {quote?.packagingCharge ? (
              <div className="bill-row">
                <span>Packaging</span>
                <i aria-hidden="true" />
                <strong>{formatCurrency.format(quote.packagingCharge)}</strong>
              </div>
            ) : null}
            {quote?.tipAmount ? (
              <div className="bill-row">
                <span>Tip</span>
                <i aria-hidden="true" />
                <strong>{formatCurrency.format(quote.tipAmount)}</strong>
              </div>
            ) : null}
            {quote?.taxAmount ? (
              <div className="bill-tax-breakup">
                <div className="bill-row bill-row-muted">
                  <span>CGST {quote?.gstRate ? `(${quote.gstRate / 2}%)` : ''}</span>
                  <i aria-hidden="true" />
                  <strong>{formatCurrency.format(quote?.cgstAmount ?? 0)}</strong>
                </div>
                <div className="bill-row bill-row-muted">
                  <span>SGST {quote?.gstRate ? `(${quote.gstRate / 2}%)` : ''}</span>
                  <i aria-hidden="true" />
                  <strong>{formatCurrency.format(quote?.sgstAmount ?? 0)}</strong>
                </div>
              </div>
            ) : null}
            <div className="bill-row bill-row-payable">
              <span>Payable</span>
              <i aria-hidden="true" />
              <strong>{formatCurrency.format(totalAmount)}</strong>
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
              {isSubmitting
                ? 'Processing...'
                : paymentMethod === 'COD'
                  ? 'Place COD order'
                  : 'Confirm checkout'}
            </button>
          )}
        </aside>
      </div>

      {couponDialogOpen ? (
        <div className="checkout-offer-dialog-backdrop" role="presentation" onMouseDown={() => setCouponDialogOpen(false)}>
          <div
            className="checkout-offer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-offer-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="checkout-offer-dialog-header">
              <div>
                <h3 id="checkout-offer-dialog-title">Available offers</h3>
                <p>Choose the best coupon for this order.</p>
              </div>
              <button
                type="button"
                className="checkout-offer-dialog-close"
                onClick={() => setCouponDialogOpen(false)}
                aria-label="Close offers"
              >
                Close
              </button>
            </div>
            <div className="checkout-offer-dialog-list">
              {sortedCoupons.map((coupon, index) => renderCouponCard(coupon, index, true))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

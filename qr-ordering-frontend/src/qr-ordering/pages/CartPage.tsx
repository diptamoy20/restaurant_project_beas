import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { CartItemRow } from '../components/cart/CartItemRow';
import { BrandHeader } from '../components/common/BrandHeader';
import { StateMessage } from '../components/common/StateMessage';
import { PageShell } from '../components/layout/PageShell';
import { ORDER_SUCCESS_STORAGE_KEY } from '../constants/storage';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage } from '../services/api/axiosInstance';
import { placeQROrder } from '../services/api/qrOrderingApi';
import type { QRCreateOrderPayload, QRStoredOrderSuccess } from '../types/order.types';
import { formatCurrency } from '../utils/formatters';

export function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    restaurant,
    restaurantId,
    tableId,
    tableLabel,
    subtotal,
    total,
    clearCart,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
  } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const menuPath = restaurantId && tableId ? `/menu/${restaurantId}/${tableId}` : '/menu/1/1';

  const handlePlaceOrder = async () => {
    if (!restaurantId || !tableId) {
      toast.error('Table context is missing. Please scan the QR again.');
      return;
    }

    const payload: QRCreateOrderPayload = {
      restaurantId,
      tableId,
      paymentMethod: 'COD',
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variant?.id,
        quantity: item.quantity,
      })),
    };

    setIsPlacingOrder(true);
    try {
      const order = await placeQROrder(payload);
      const successPayload: QRStoredOrderSuccess = {
        ...order,
        tableName: tableLabel,
        restaurantName: restaurant?.name,
      };
      localStorage.setItem(ORDER_SUCCESS_STORAGE_KEY, JSON.stringify(successPayload));
      clearCart();
      toast.success('Order placed successfully');
      navigate('/order-success');
    } catch (error) {
      toast.error(getApiErrorMessage(error).message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <PageShell className="qr-cart-page">
      <BrandHeader
        title="View Cart"
        tableName={tableLabel}
        restaurantName={restaurant?.name}
        compact
      />
      <section className="qr-cart-panel">
        <h2>Order Summary</h2>
        {items.length === 0 ? (
          <StateMessage
            title="Your cart is empty"
            message="Pick a few dishes from the menu and they will show up here."
            actionLabel="Back to menu"
            onAction={() => navigate(menuPath)}
          />
        ) : (
          <>
            <div className="qr-cart-list">
              {items.map((item) => (
                <CartItemRow
                  key={item.cartKey}
                  item={item}
                  onIncrease={() => increaseQuantity(item.cartKey)}
                  onDecrease={() => decreaseQuantity(item.cartKey)}
                  onRemove={() => removeItem(item.cartKey)}
                />
              ))}
            </div>
            <div className="qr-cart-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div>
                <span>GST</span>
                <strong>Included</strong>
              </div>
              <div className="is-total">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>
            <label className="qr-notes">
              <span>Notes for Restaurant</span>
              <textarea placeholder="Less spicy, no onion, extra cutlery..." />
            </label>
            <button
              className="qr-place-order"
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || items.length === 0}
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
          </>
        )}
      </section>
    </PageShell>
  );
}

import { useCallback } from 'react';
import { paymentApi } from '../services/paymentApi';
import { loadRazorpayScript, openRazorpayCheckout } from '../utils/razorpay';

export function useRazorpayPayment() {
  const startRazorpayPayment = useCallback(async ({ order, user, onSuccess, onFailure }) => {
    // Safety check: Reject COD orders to prevent Razorpay operations
    if (order?.paymentMethod === 'COD') {
      const error = 'Cash on Delivery orders do not require online payment.';
      onFailure?.(error);
      throw new Error(error);
    }

    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      throw new Error('Payment configuration missing: VITE_RAZORPAY_KEY_ID');
    }

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      throw new Error('Unable to load payment gateway. Please try again.');
    }

    const razorpayOrder = await paymentApi.createRazorpayOrder(order.id);

    await new Promise((resolve, reject) => {
      const checkout = openRazorpayCheckout({
        key: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.razorpayOrderId,
        name: 'Restaurant App',
        description: `Payment for order ${order.orderNumber}`,
        prefill: {
          name: user?.name || 'Guest User',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        notes: {
          internalOrderId: String(order.id),
        },
        handler: async (response) => {
          try {
            await paymentApi.verifyRazorpayPayment({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess?.();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await paymentApi.recordRazorpayFailure({
                orderId: order.id,
                razorpayOrderId: razorpayOrder.razorpayOrderId,
                reason: 'Checkout popup closed by customer',
              });
            } finally {
              onFailure?.('Payment was cancelled.');
              reject(new Error('Payment was cancelled.'));
            }
          },
        },
      });

      checkout.on('payment.failed', async (failureEvent) => {
        try {
          await paymentApi.recordRazorpayFailure({
            orderId: order.id,
            razorpayOrderId: razorpayOrder.razorpayOrderId,
            reason: failureEvent?.error?.description || 'Payment failed at gateway',
          });
        } finally {
          onFailure?.(failureEvent?.error?.description || 'Payment failed');
          reject(new Error(failureEvent?.error?.description || 'Payment failed'));
        }
      });
    });
  }, []);

  return { startRazorpayPayment };
}

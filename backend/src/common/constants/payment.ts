export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Cash-on-delivery method values stored on orders or payments. */
export const COD_PAYMENT_METHODS = ['COD', 'CASH_ON_DELIVERY', 'CASH'] as const;

export type CodPaymentMethodValue = (typeof COD_PAYMENT_METHODS)[number];

export function isCodPaymentMethod(method: string | null | undefined): method is CodPaymentMethodValue {
  if (!method) {
    return false;
  }

  const normalized = method.trim().toUpperCase();
  return (COD_PAYMENT_METHODS as readonly string[]).includes(normalized);
}

export enum CouponCheckoutStatus {
  AVAILABLE = 'AVAILABLE',
  LIMIT_REACHED = 'LIMIT_REACHED',
  MIN_ORDER_NOT_MET = 'MIN_ORDER_NOT_MET',
  USER_NOT_ELIGIBLE = 'USER_NOT_ELIGIBLE',
  FIRST_ORDER_ONLY = 'FIRST_ORDER_ONLY',
  PAYMENT_METHOD_REQUIRED = 'PAYMENT_METHOD_REQUIRED',
  EXPIRED = 'EXPIRED',
  NOT_STARTED = 'NOT_STARTED',
}

export enum CouponCheckoutCategory {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  USED = 'USED',
}

type CouponLike = {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  minOrderAmount: number | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
};

export type CouponCheckoutEvaluation = {
  status: CouponCheckoutStatus;
  category: CouponCheckoutCategory;
  eligible: boolean;
  message: string | null;
  usageCount: number | null;
  usageLimit: number | null;
};

const CATEGORY_SORT_ORDER: Record<CouponCheckoutCategory, number> = {
  [CouponCheckoutCategory.AVAILABLE]: 0,
  [CouponCheckoutCategory.LOCKED]: 1,
  [CouponCheckoutCategory.USED]: 2,
};

export function getCouponCategorySortOrder(category: CouponCheckoutCategory): number {
  return CATEGORY_SORT_ORDER[category];
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function evaluateCouponForCheckout(params: {
  coupon: CouponLike;
  subtotalAmount: number;
  userUsageCount: number;
  totalUsageCount: number;
  roundMoney: (value: number) => number;
  now?: Date;
}): CouponCheckoutEvaluation {
  const { coupon, subtotalAmount, userUsageCount, totalUsageCount, roundMoney } = params;
  const now = params.now ?? new Date();

  if (!coupon.isActive) {
    return {
      status: CouponCheckoutStatus.USER_NOT_ELIGIBLE,
      category: CouponCheckoutCategory.LOCKED,
      eligible: false,
      message: 'This coupon is not available for your account.',
      usageCount: null,
      usageLimit: null,
    };
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return {
      status: CouponCheckoutStatus.EXPIRED,
      category: CouponCheckoutCategory.LOCKED,
      eligible: false,
      message: 'This coupon has expired.',
      usageCount: null,
      usageLimit: null,
    };
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    return {
      status: CouponCheckoutStatus.NOT_STARTED,
      category: CouponCheckoutCategory.LOCKED,
      eligible: false,
      message: `This coupon will be available from ${coupon.startsAt.toLocaleDateString('en-IN')}.`,
      usageCount: null,
      usageLimit: null,
    };
  }

  if (coupon.usageLimitPerUser && userUsageCount >= coupon.usageLimitPerUser) {
    return {
      status: CouponCheckoutStatus.LIMIT_REACHED,
      category: CouponCheckoutCategory.USED,
      eligible: false,
      message: `You've already used this coupon ${userUsageCount} out of ${coupon.usageLimitPerUser} times.`,
      usageCount: userUsageCount,
      usageLimit: coupon.usageLimitPerUser,
    };
  }

  if (coupon.usageLimitTotal && totalUsageCount >= coupon.usageLimitTotal) {
    return {
      status: CouponCheckoutStatus.LIMIT_REACHED,
      category: CouponCheckoutCategory.USED,
      eligible: false,
      message: `Usage limit reached. This coupon has been used ${totalUsageCount} out of ${coupon.usageLimitTotal} times.`,
      usageCount: totalUsageCount,
      usageLimit: coupon.usageLimitTotal,
    };
  }

  if (coupon.minOrderAmount && subtotalAmount < coupon.minOrderAmount) {
    const shortfall = roundMoney(coupon.minOrderAmount - subtotalAmount);
    return {
      status: CouponCheckoutStatus.MIN_ORDER_NOT_MET,
      category: CouponCheckoutCategory.LOCKED,
      eligible: false,
      message: `Order ${formatCurrency(shortfall)} more to unlock this coupon.`,
      usageCount: null,
      usageLimit: null,
    };
  }

  return {
    status: CouponCheckoutStatus.AVAILABLE,
    category: CouponCheckoutCategory.AVAILABLE,
    eligible: true,
    message: null,
    usageCount: coupon.usageLimitPerUser ? userUsageCount : null,
    usageLimit: coupon.usageLimitPerUser,
  };
}

export function buildCouponApplyErrorMessage(params: {
  coupon: CouponLike;
  subtotalAmount: number;
  userUsageCount: number;
  totalUsageCount: number;
  roundMoney: (value: number) => number;
  now?: Date;
  invalidReason?: 'NOT_FOUND' | 'RESTAURANT_MISMATCH';
}): string {
  if (params.invalidReason === 'NOT_FOUND') {
    return 'Coupon is invalid or inactive.';
  }

  if (params.invalidReason === 'RESTAURANT_MISMATCH') {
    return 'This coupon is not valid for this restaurant.';
  }

  const evaluation = evaluateCouponForCheckout(params);
  return evaluation.message ?? 'This coupon cannot be applied to your order.';
}

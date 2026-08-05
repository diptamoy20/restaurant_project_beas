export const COUPON_CATEGORY = {
  AVAILABLE: "AVAILABLE",
  LOCKED: "LOCKED",
  USED: "USED",
};

const CATEGORY_ORDER = {
  [COUPON_CATEGORY.AVAILABLE]: 0,
  [COUPON_CATEGORY.LOCKED]: 1,
  [COUPON_CATEGORY.USED]: 2,
};

function isExpiredCoupon(coupon) {
  if (coupon?.status === "EXPIRED") {
    return true;
  }

  if (
    coupon?.expiresAt &&
    Number.isFinite(new Date(coupon.expiresAt).getTime()) &&
    new Date(coupon.expiresAt).getTime() < Date.now()
  ) {
    return true;
  }

  return false;
}

export function sortCoupons(coupons) {
  return (coupons ?? [])
    .filter((coupon) => !isExpiredCoupon(coupon))
    .sort((left, right) => {
      const leftCategory =
        left.category ??
        (left.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED);
      const rightCategory =
        right.category ??
        (right.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED);

      return (
        (CATEGORY_ORDER[leftCategory] ?? 1) - (CATEGORY_ORDER[rightCategory] ?? 1) ||
        Number(right.eligible) - Number(left.eligible) ||
        (right.estimatedDiscount ?? 0) - (left.estimatedDiscount ?? 0)
      );
    });
}

export function groupCouponsByCategory(coupons) {
  const sorted = sortCoupons(coupons);

  return {
    available: sorted.filter(
      (coupon) =>
        (coupon.category ?? (coupon.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED)) ===
        COUPON_CATEGORY.AVAILABLE,
    ),
    locked: sorted.filter(
      (coupon) =>
        (coupon.category ?? (coupon.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED)) ===
        COUPON_CATEGORY.LOCKED,
    ),
    used: sorted.filter(
      (coupon) =>
        (coupon.category ?? (coupon.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED)) ===
        COUPON_CATEGORY.USED,
    ),
  };
}

export function getCouponCardClassName(coupon) {
  const category =
    coupon.category ?? (coupon.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED);

  if (category === COUPON_CATEGORY.AVAILABLE) {
    return "checkout-offer-card";
  }

  if (category === COUPON_CATEGORY.USED) {
    return "checkout-offer-card is-used";
  }

  return "checkout-offer-card is-locked";
}

export function getCouponStatusMessage(coupon) {
  return coupon.message || coupon.reason || null;
}

export function canApplyCoupon(coupon) {
  const category =
    coupon.category ?? (coupon.eligible ? COUPON_CATEGORY.AVAILABLE : COUPON_CATEGORY.LOCKED);

  return category === COUPON_CATEGORY.AVAILABLE && coupon.eligible !== false;
}

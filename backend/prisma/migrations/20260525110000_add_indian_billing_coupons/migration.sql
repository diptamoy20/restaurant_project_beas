ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "gstin" TEXT,
  ADD COLUMN IF NOT EXISTS "gst_rate" DOUBLE PRECISION NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "gst_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "gst_mode" TEXT NOT NULL DEFAULT 'EXCLUSIVE';

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "subtotal_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "menu_discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "coupon_discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "manual_discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxable_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "gst_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cgst_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "igst_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "orders"
SET
  "subtotal_amount" = CASE WHEN "subtotal_amount" = 0 THEN "total_amount" ELSE "subtotal_amount" END,
  "taxable_amount" = CASE
    WHEN "taxable_amount" = 0 THEN GREATEST("total_amount" - COALESCE("discount_amount", 0), 0)
    ELSE "taxable_amount"
  END;

ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "restaurant_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "max_discount_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usage_limit_total" INTEGER,
  ADD COLUMN IF NOT EXISTS "usage_limit_per_user" INTEGER,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "coupon_usages"
  ADD COLUMN IF NOT EXISTS "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "coupons"
      ADD CONSTRAINT "coupons_restaurant_id_fkey"
      FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "coupons_restaurant_id_idx" ON "coupons"("restaurant_id");
CREATE INDEX IF NOT EXISTS "coupons_is_active_idx" ON "coupons"("is_active");
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_id_idx" ON "coupon_usages"("coupon_id");
CREATE INDEX IF NOT EXISTS "coupon_usages_user_id_idx" ON "coupon_usages"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupon_usages_coupon_id_order_id_key'
  ) THEN
    ALTER TABLE "coupon_usages"
      ADD CONSTRAINT "coupon_usages_coupon_id_order_id_key"
      UNIQUE ("coupon_id", "order_id");
  END IF;
END $$;

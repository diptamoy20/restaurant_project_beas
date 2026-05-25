DROP INDEX IF EXISTS "coupons_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_global_code_key"
ON "coupons"("code")
WHERE "restaurant_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_restaurant_code_key"
ON "coupons"("code", "restaurant_id")
WHERE "restaurant_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "coupons_code_restaurant_id_idx"
ON "coupons"("code", "restaurant_id");

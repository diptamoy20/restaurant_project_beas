SELECT set_config('search_path', current_schema() || ', public', false);

ALTER TABLE "delivery_zones"
  ALTER COLUMN "updated_at" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_zones_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "delivery_zones" DROP CONSTRAINT "delivery_zones_restaurant_id_fkey";
  END IF;

  ALTER TABLE "delivery_zones"
    ADD CONSTRAINT "delivery_zones_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id")
    REFERENCES "restaurants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "restaurants_location_gix"
ON "restaurants"
USING GIST ("location");

CREATE INDEX IF NOT EXISTS "delivery_zones_restaurant_id_idx"
ON "delivery_zones" ("restaurant_id");

CREATE INDEX IF NOT EXISTS "delivery_zones_polygon_gix"
ON "delivery_zones"
USING GIST ("polygon");

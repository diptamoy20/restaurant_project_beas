CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "restaurants"
  ADD COLUMN IF NOT EXISTS "delivery_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS "is_location_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "location" geography(Point,4326);

UPDATE "restaurants"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "location" IS NULL;

CREATE OR REPLACE FUNCTION set_restaurant_location_from_coordinates()
RETURNS trigger AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restaurants_location_sync ON "restaurants";
CREATE TRIGGER restaurants_location_sync
BEFORE INSERT OR UPDATE OF "latitude", "longitude"
ON "restaurants"
FOR EACH ROW
EXECUTE FUNCTION set_restaurant_location_from_coordinates();

CREATE INDEX IF NOT EXISTS "restaurants_location_gix"
ON "restaurants"
USING GIST ("location");

CREATE TABLE IF NOT EXISTS "delivery_zones" (
  "id" SERIAL PRIMARY KEY,
  "restaurant_id" INTEGER NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
  "polygon" geometry(Polygon,4326) NOT NULL,
  "minimum_order_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "delivery_zones_restaurant_id_idx"
ON "delivery_zones" ("restaurant_id");

CREATE INDEX IF NOT EXISTS "delivery_zones_polygon_gix"
ON "delivery_zones"
USING GIST ("polygon");

CREATE OR REPLACE FUNCTION touch_delivery_zone_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delivery_zones_touch_updated_at ON "delivery_zones";
CREATE TRIGGER delivery_zones_touch_updated_at
BEFORE UPDATE ON "delivery_zones"
FOR EACH ROW
EXECUTE FUNCTION touch_delivery_zone_updated_at();

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "cuisine_type" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "image_url" TEXT,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex for better query performance on location-based searches
CREATE INDEX "restaurants_latitude_longitude_idx" ON "restaurants"("latitude", "longitude");
CREATE INDEX "restaurants_is_active_idx" ON "restaurants"("is_active");
CREATE INDEX "restaurants_delivery_radius_km_idx" ON "restaurants"("delivery_radius_km");

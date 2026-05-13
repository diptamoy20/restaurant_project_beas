-- DropIndex
DROP INDEX "restaurants_delivery_radius_km_idx";

-- DropIndex
DROP INDEX "restaurants_is_active_idx";

-- DropIndex
DROP INDEX "restaurants_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "restaurants" ALTER COLUMN "updated_at" DROP DEFAULT;

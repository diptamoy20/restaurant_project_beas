-- DropForeignKey
ALTER TABLE "delivery_zones" DROP CONSTRAINT "delivery_zones_restaurant_id_fkey";

-- DropIndex
DROP INDEX "delivery_zones_polygon_gix";

-- DropIndex
DROP INDEX "delivery_zones_restaurant_id_idx";

-- DropIndex
DROP INDEX "restaurants_location_gix";

-- AlterTable
ALTER TABLE "delivery_zones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

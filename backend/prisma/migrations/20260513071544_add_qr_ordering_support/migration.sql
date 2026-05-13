-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'QR_DINE_IN', 'ADMIN');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- DropIndex
DROP INDEX "restaurants_delivery_radius_km_idx";

-- DropIndex
DROP INDEX "restaurants_is_active_idx";

-- DropIndex
DROP INDEX "restaurants_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE',
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "restaurants" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

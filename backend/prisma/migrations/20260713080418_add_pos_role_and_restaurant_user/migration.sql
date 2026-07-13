-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'POS';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "restaurant_id" INTEGER;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

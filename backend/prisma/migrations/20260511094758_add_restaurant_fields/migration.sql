-- DropIndex
DROP INDEX IF EXISTS "restaurants_delivery_radius_km_idx";

-- DropIndex
DROP INDEX IF EXISTS "restaurants_is_active_idx";

-- DropIndex
DROP INDEX IF EXISTS "restaurants_latitude_longitude_idx";

-- AlterTable
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'restaurants'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "restaurants" ALTER COLUMN "updated_at" DROP DEFAULT;
    END IF;
END $$;

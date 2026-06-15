DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'restaurant_tables'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "restaurant_tables" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'table_sessions'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "table_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;

-- Add slug column (nullable during backfill)
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Backfill unique slugs from restaurant names
DO $$
DECLARE
  restaurant_row RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR restaurant_row IN
    SELECT id, name FROM restaurants WHERE slug IS NULL ORDER BY id
  LOOP
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          trim(restaurant_row.name),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      )
    );

    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'restaurant';
    END IF;

    candidate := base_slug;
    suffix := 2;

    WHILE EXISTS (
      SELECT 1 FROM restaurants
      WHERE slug = candidate AND id <> restaurant_row.id
    ) LOOP
      candidate := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE restaurants SET slug = candidate WHERE id = restaurant_row.id;
  END LOOP;
END $$;

ALTER TABLE "restaurants" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "restaurants_slug_key" ON "restaurants"("slug");

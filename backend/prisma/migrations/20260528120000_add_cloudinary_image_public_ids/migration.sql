ALTER TABLE "users"
  ADD COLUMN "profile_image_public_id" TEXT;

ALTER TABLE "restaurants"
  ADD COLUMN "image_public_id" TEXT;

ALTER TABLE "menu_items"
  ADD COLUMN "image_public_id" TEXT;

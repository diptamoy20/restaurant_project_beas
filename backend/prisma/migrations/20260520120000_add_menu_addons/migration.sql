CREATE TABLE "addon_groups" (
  "id" SERIAL NOT NULL,
  "menu_item_id" INTEGER NOT NULL,
  "restaurant_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "selection_type" TEXT NOT NULL DEFAULT 'MULTI',
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "min_select" INTEGER,
  "max_select" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "addon_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "addon_options" (
  "id" SERIAL NOT NULL,
  "group_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "addon_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_item_addons" (
  "id" SERIAL NOT NULL,
  "order_item_id" INTEGER NOT NULL,
  "addon_group_id" INTEGER,
  "addon_option_id" INTEGER,
  "addon_group_name" TEXT NOT NULL,
  "addon_option_name" TEXT NOT NULL,
  "addon_option_price" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "addon_groups_restaurant_id_idx" ON "addon_groups"("restaurant_id");
CREATE INDEX "addon_groups_menu_item_id_idx" ON "addon_groups"("menu_item_id");
CREATE INDEX "addon_options_group_id_idx" ON "addon_options"("group_id");
CREATE INDEX "order_item_addons_order_item_id_idx" ON "order_item_addons"("order_item_id");
CREATE INDEX "order_item_addons_addon_option_id_idx" ON "order_item_addons"("addon_option_id");

ALTER TABLE "addon_groups"
  ADD CONSTRAINT "addon_groups_menu_item_id_fkey"
  FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "addon_groups"
  ADD CONSTRAINT "addon_groups_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "addon_options"
  ADD CONSTRAINT "addon_options_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "addon_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item_addons"
  ADD CONSTRAINT "order_item_addons_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item_addons"
  ADD CONSTRAINT "order_item_addons_addon_option_id_fkey"
  FOREIGN KEY ("addon_option_id") REFERENCES "addon_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

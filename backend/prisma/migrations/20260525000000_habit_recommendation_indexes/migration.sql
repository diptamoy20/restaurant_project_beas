CREATE INDEX IF NOT EXISTS "orders_user_id_restaurant_id_created_at_idx"
ON "orders"("user_id", "restaurant_id", "created_at");

CREATE INDEX IF NOT EXISTS "orders_restaurant_id_created_at_idx"
ON "orders"("restaurant_id", "created_at");

CREATE INDEX IF NOT EXISTS "order_items_order_id_menu_item_id_idx"
ON "order_items"("order_id", "menu_item_id");

CREATE INDEX IF NOT EXISTS "order_items_menu_item_id_idx"
ON "order_items"("menu_item_id");

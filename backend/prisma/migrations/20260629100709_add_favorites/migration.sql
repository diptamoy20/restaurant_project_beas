-- CreateTable
CREATE TABLE "favorite_menu_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_menu_items_user_id_idx" ON "favorite_menu_items"("user_id");

-- CreateIndex
CREATE INDEX "favorite_menu_items_menu_item_id_idx" ON "favorite_menu_items"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_menu_items_user_id_menu_item_id_key" ON "favorite_menu_items"("user_id", "menu_item_id");

-- AddForeignKey
ALTER TABLE "favorite_menu_items" ADD CONSTRAINT "favorite_menu_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_menu_items" ADD CONSTRAINT "favorite_menu_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

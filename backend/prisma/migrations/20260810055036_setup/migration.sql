-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('HEALTHY', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('STORE', 'KITCHEN');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('STORE_RECEIVE_WAREHOUSE', 'KITCHEN_ISSUE', 'KITCHEN_RECEIVE', 'RECIPE_CONSUMPTION', 'WASTE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "cost_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_inventories" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "available_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimum_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximum_stock" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "reorder_level" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "status" "StockStatus" NOT NULL DEFAULT 'HEALTHY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_inventories" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "available_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimum_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StockStatus" NOT NULL DEFAULT 'HEALTHY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "yield_quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'GM',

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_transfers" (
    "id" SERIAL NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_user_id" INTEGER,
    "approved_by_user_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_transfer_items" (
    "id" SERIAL NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "kitchen_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_requisitions" (
    "id" SERIAL NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "requested_by_user_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_requisition_items" (
    "id" SERIAL NOT NULL,
    "requisition_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "restaurant_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transaction_ledgers" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "inventory_type" "InventoryType" NOT NULL,
    "item_id" INTEGER NOT NULL,
    "transaction_type" "InventoryTransactionType" NOT NULL,
    "order_id" INTEGER,
    "recipe_id" INTEGER,
    "reference_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "before_quantity" DOUBLE PRECISION NOT NULL,
    "after_quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "performed_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transaction_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_consumption_logs" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "menu_item_id" INTEGER NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity_consumed" DOUBLE PRECISION NOT NULL,
    "before_quantity" DOUBLE PRECISION NOT NULL,
    "after_quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_consumption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_restaurant_id_category_idx" ON "inventory_items"("restaurant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_restaurant_id_name_key" ON "inventory_items"("restaurant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "store_inventories_item_id_key" ON "store_inventories"("item_id");

-- CreateIndex
CREATE INDEX "store_inventories_restaurant_id_status_idx" ON "store_inventories"("restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_inventories_item_id_key" ON "kitchen_inventories"("item_id");

-- CreateIndex
CREATE INDEX "kitchen_inventories_restaurant_id_status_idx" ON "kitchen_inventories"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "recipes_restaurant_id_menu_item_id_idx" ON "recipes"("restaurant_id", "menu_item_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_item_id_idx" ON "recipe_ingredients"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_transfers_transfer_number_key" ON "kitchen_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "kitchen_transfers_restaurant_id_status_idx" ON "kitchen_transfers"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "kitchen_transfer_items_transfer_id_idx" ON "kitchen_transfer_items"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_requisitions_requisition_number_key" ON "restaurant_requisitions"("requisition_number");

-- CreateIndex
CREATE INDEX "restaurant_requisitions_restaurant_id_status_idx" ON "restaurant_requisitions"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "restaurant_requisition_items_requisition_id_idx" ON "restaurant_requisition_items"("requisition_id");

-- CreateIndex
CREATE INDEX "inventory_transaction_ledgers_restaurant_id_inventory_type__idx" ON "inventory_transaction_ledgers"("restaurant_id", "inventory_type", "created_at");

-- CreateIndex
CREATE INDEX "inventory_transaction_ledgers_item_id_idx" ON "inventory_transaction_ledgers"("item_id");

-- CreateIndex
CREATE INDEX "kitchen_consumption_logs_restaurant_id_timestamp_idx" ON "kitchen_consumption_logs"("restaurant_id", "timestamp");

-- CreateIndex
CREATE INDEX "kitchen_consumption_logs_order_id_idx" ON "kitchen_consumption_logs"("order_id");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_inventories" ADD CONSTRAINT "kitchen_inventories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_inventories" ADD CONSTRAINT "kitchen_inventories_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_transfers" ADD CONSTRAINT "kitchen_transfers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_transfer_items" ADD CONSTRAINT "kitchen_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "kitchen_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_transfer_items" ADD CONSTRAINT "kitchen_transfer_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_requisitions" ADD CONSTRAINT "restaurant_requisitions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_requisition_items" ADD CONSTRAINT "restaurant_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "restaurant_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_requisition_items" ADD CONSTRAINT "restaurant_requisition_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction_ledgers" ADD CONSTRAINT "inventory_transaction_ledgers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transaction_ledgers" ADD CONSTRAINT "inventory_transaction_ledgers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_consumption_logs" ADD CONSTRAINT "kitchen_consumption_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_consumption_logs" ADD CONSTRAINT "kitchen_consumption_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_consumption_logs" ADD CONSTRAINT "kitchen_consumption_logs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterTable restaurant_tables
ALTER TABLE "restaurant_tables" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "restaurant_tables" ADD COLUMN "table_token" TEXT;
ALTER TABLE "restaurant_tables" ADD COLUMN "qr_code_url" TEXT;
ALTER TABLE "restaurant_tables" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "restaurant_tables" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "restaurant_tables" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable table_sessions
CREATE TABLE "table_sessions" (
    "id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "table_id" INTEGER NOT NULL,
    "session_token" TEXT NOT NULL,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN "session_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_table_token_key" ON "restaurant_tables"("table_token");
CREATE UNIQUE INDEX "restaurant_tables_restaurant_id_table_number_key" ON "restaurant_tables"("restaurant_id", "table_number");
CREATE UNIQUE INDEX "table_sessions_session_token_key" ON "table_sessions"("session_token");
CREATE INDEX "table_sessions_table_id_status_idx" ON "table_sessions"("table_id", "status");
CREATE INDEX "table_sessions_restaurant_id_status_idx" ON "table_sessions"("restaurant_id", "status");

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill table tokens for existing rows
UPDATE "restaurant_tables"
SET "table_token" = 'tbl_' || md5(random()::text || clock_timestamp()::text || id::text)
WHERE "table_token" IS NULL;

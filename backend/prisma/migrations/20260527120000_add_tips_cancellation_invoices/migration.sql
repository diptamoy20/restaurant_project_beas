-- Add tip, cancellation audit, and invoice support.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "tip_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" INTEGER;

ALTER TABLE "order_status_logs"
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "changed_by_user_id" INTEGER;

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'LOCKED',
  "issued_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_order_id_key" ON "invoices"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

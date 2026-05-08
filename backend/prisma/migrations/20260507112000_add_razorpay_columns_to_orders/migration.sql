ALTER TABLE "orders"
ADD COLUMN "payment_method" TEXT,
ADD COLUMN "razorpay_order_id" TEXT,
ADD COLUMN "razorpay_payment_id" TEXT,
ADD COLUMN "razorpay_signature" TEXT,
ADD COLUMN "payment_failure_reason" TEXT,
ADD COLUMN "payment_retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "razorpay_details" JSONB;

ALTER TABLE "delivery_agents"
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "address" TEXT,
ADD COLUMN "date_of_birth" DATE,
ADD COLUMN "gender" TEXT,
ADD COLUMN "emergency_contact" TEXT,
ADD COLUMN "vehicle_type" TEXT,
ADD COLUMN "vehicle_number" TEXT,
ADD COLUMN "vehicle_brand" TEXT,
ADD COLUMN "vehicle_color" TEXT;

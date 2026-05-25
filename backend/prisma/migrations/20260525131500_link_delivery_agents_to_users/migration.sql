ALTER TABLE "delivery_agents" ADD COLUMN "user_id" INTEGER;

CREATE UNIQUE INDEX "delivery_agents_user_id_key" ON "delivery_agents"("user_id");
CREATE INDEX "delivery_agents_phone_idx" ON "delivery_agents"("phone");

ALTER TABLE "delivery_agents" ADD CONSTRAINT "delivery_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "delivery_agents"
SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'delivery@example.com' LIMIT 1)
WHERE "user_id" IS NULL
  AND "id" = (SELECT "id" FROM "delivery_agents" ORDER BY "id" LIMIT 1)
  AND EXISTS (SELECT 1 FROM "users" WHERE "email" = 'delivery@example.com');

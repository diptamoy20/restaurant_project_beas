-- Keep one role per user before adding the uniqueness constraint.
-- Priority preserves staff access first, then customer accounts.
WITH ranked_roles AS (
  SELECT
    urm.id,
    ROW_NUMBER() OVER (
      PARTITION BY urm.user_id
      ORDER BY
        CASE rm.name
          WHEN 'admin' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'delivery_boy' THEN 3
          WHEN 'customer' THEN 4
          ELSE 5
        END,
        urm.id
    ) AS role_rank
  FROM "user_role_mapping" urm
  JOIN "role_master" rm ON rm.id = urm.role_id
)
DELETE FROM "user_role_mapping" urm
USING ranked_roles ranked
WHERE urm.id = ranked.id
  AND ranked.role_rank > 1;

ALTER TABLE "user_role_mapping" RENAME TO "user_role";
ALTER INDEX "user_role_mapping_pkey" RENAME TO "user_role_pkey";
ALTER TABLE "user_role" RENAME CONSTRAINT "user_role_mapping_user_id_fkey" TO "user_role_user_id_fkey";
ALTER TABLE "user_role" RENAME CONSTRAINT "user_role_mapping_role_id_fkey" TO "user_role_role_id_fkey";

CREATE UNIQUE INDEX "user_role_user_id_key" ON "user_role"("user_id");

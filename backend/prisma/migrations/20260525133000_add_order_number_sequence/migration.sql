CREATE SEQUENCE IF NOT EXISTS "orders_order_number_seq"
  AS BIGINT
  START WITH 1001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

SELECT setval(
  'orders_order_number_seq',
  GREATEST(
    1000,
    COALESCE(
      (
        SELECT MAX(SUBSTRING("order_number" FROM 5)::BIGINT)
        FROM "orders"
        WHERE "order_number" ~ '^ORD-[0-9]+$'
      ),
      1000
    )
  ),
  true
);

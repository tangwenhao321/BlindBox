-- Bind fragment SKUs to catalog products so exchange can grant warehouse inventory.

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'fragment_exchange_sku'
       AND COLUMN_NAME = 'product_id') = 0,
    'ALTER TABLE fragment_exchange_sku ADD COLUMN product_id VARCHAR(32) NULL COMMENT ''catalog product granted on exchange'' AFTER cover',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Best-effort backfill by exact name match.
UPDATE fragment_exchange_sku s
INNER JOIN product p ON p.name = s.name
SET s.product_id = p.id
WHERE s.product_id IS NULL;

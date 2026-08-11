-- Active marketplace listing uniqueness + idempotent stock rollback ledger.

SET @db := DATABASE();

-- Partial unique: only ON_SALE/COOLING rows compete for the same order+product.
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND COLUMN_NAME = 'active_sku_key') = 0,
    'ALTER TABLE marketplace_listing ADD COLUMN active_sku_key VARCHAR(128)
        GENERATED ALWAYS AS (
            CASE WHEN status IN (''ON_SALE'', ''COOLING'')
                 THEN CONCAT(mystery_box_order_id, ''#'', product_id)
                 ELSE NULL END
        ) STORED',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND INDEX_NAME = 'uk_marketplace_listing_active_sku') = 0,
    'CREATE UNIQUE INDEX uk_marketplace_listing_active_sku ON marketplace_listing (active_sku_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS order_stock_rollback (
    order_id VARCHAR(32) NOT NULL PRIMARY KEY,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

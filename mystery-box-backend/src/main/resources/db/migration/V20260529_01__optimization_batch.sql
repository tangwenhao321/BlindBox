-- Marketplace buyer ship tracking
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND COLUMN_NAME = 'buyer_ship_status') = 0,
    'ALTER TABLE marketplace_listing ADD COLUMN buyer_ship_status VARCHAR(16) NULL COMMENT ''PENDING_SHIP/SHIPPED for SOLD buyers''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'warehouse_ship_request_item' AND COLUMN_NAME = 'listing_id') = 0,
    'ALTER TABLE warehouse_ship_request_item ADD COLUMN listing_id VARCHAR(32) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'warehouse_ship_request' AND COLUMN_NAME = 'reject_reason') = 0,
    'ALTER TABLE warehouse_ship_request ADD COLUMN reject_reason VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE marketplace_listing
SET buyer_ship_status = 'PENDING_SHIP'
WHERE status = 'SOLD' AND buyer_ship_status IS NULL;

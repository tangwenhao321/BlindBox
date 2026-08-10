SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'warehouse_ship_request' AND COLUMN_NAME = 'carrier_code') = 0,
    'ALTER TABLE warehouse_ship_request ADD COLUMN carrier_code VARCHAR(32) NULL COMMENT ''express carrier code''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

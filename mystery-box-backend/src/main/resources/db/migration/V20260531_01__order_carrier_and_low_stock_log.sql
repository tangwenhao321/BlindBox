SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'base_order' AND COLUMN_NAME = 'carrier_code') = 0,
    'ALTER TABLE base_order ADD COLUMN carrier_code VARCHAR(32) NULL COMMENT ''express carrier code''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS ops_low_stock_alert_log (
    box_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    alerted_at DATETIME NOT NULL,
    PRIMARY KEY (box_id, product_id)
);

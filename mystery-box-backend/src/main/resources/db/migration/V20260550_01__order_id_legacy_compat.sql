-- Order IDs may be legacy UUID (32 hex) or new snowflake (numeric). Always look up by exact id.
-- Optional dual-read map when rewriting historical order IDs in a maintenance window.

CREATE TABLE IF NOT EXISTS order_id_legacy_map (
    legacy_id VARCHAR(32) NOT NULL PRIMARY KEY,
    current_id VARCHAR(32) NOT NULL,
    migrated_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_order_id_legacy_current (current_id)
) COMMENT 'Optional mapping from legacy order id to snowflake id';

-- Speed up exact order lookups regardless of id format.
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_order' AND INDEX_NAME = 'idx_mbo_id_status') = 0,
    'CREATE INDEX idx_mbo_id_status ON mystery_box_order (id, status)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

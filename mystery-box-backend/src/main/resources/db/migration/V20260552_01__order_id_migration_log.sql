CREATE TABLE IF NOT EXISTS order_id_migration_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    legacy_id VARCHAR(32) NOT NULL,
    current_id VARCHAR(32) NOT NULL,
    rows_updated INT NOT NULL DEFAULT 0,
    operator_id VARCHAR(64) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_oiml_created (created_time DESC)
) COMMENT 'Admin order id PK rewrite audit log';

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'order_id_legacy_map' AND INDEX_NAME = 'idx_oilm_migrated_time') = 0,
    'CREATE INDEX idx_oilm_migrated_time ON order_id_legacy_map (migrated_time ASC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

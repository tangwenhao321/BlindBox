-- Atomic per-user daily retention claim slots (prevents TOCTOU across orders).

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'order_payment_retention_daily') = 0,
    'CREATE TABLE order_payment_retention_daily (
        user_id VARCHAR(32) NOT NULL,
        claim_date DATE NOT NULL,
        slot SMALLINT NOT NULL,
        order_id VARCHAR(32) NOT NULL,
        created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (user_id, claim_date, slot),
        KEY idx_retention_daily_order (order_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

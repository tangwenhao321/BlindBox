-- Idempotent apply marker + per-user daily claim lookups.

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'order_payment_retention_claim'
       AND COLUMN_NAME = 'applied_time') = 0,
    'ALTER TABLE order_payment_retention_claim ADD COLUMN applied_time DATETIME(6) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'order_payment_retention_claim'
       AND INDEX_NAME = 'idx_retention_claim_user_claimed') = 0,
    'CREATE INDEX idx_retention_claim_user_claimed ON order_payment_retention_claim (user_id, claimed_time)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

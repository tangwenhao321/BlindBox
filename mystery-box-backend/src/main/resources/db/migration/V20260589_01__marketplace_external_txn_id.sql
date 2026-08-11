-- Proof of external marketplace disbursement (admin complete-external).

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'marketplace_trade'
       AND COLUMN_NAME = 'external_txn_id') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN external_txn_id VARCHAR(128) NULL COMMENT ''payout provider txn id'' AFTER status',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

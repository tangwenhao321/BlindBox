-- Wallet ledger idempotency: unique (user_id, change_type, related_order_id) when ref present.
-- related_order_id is the ref_id used by UserWalletService; NULL means non-idempotent (MySQL allows multiple NULLs in UNIQUE).

SET @db := DATABASE();

-- Allow NULL refs for non-idempotent ledger rows
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_balance_log' AND COLUMN_NAME = 'related_order_id') > 0,
    'ALTER TABLE user_balance_log MODIFY COLUMN related_order_id VARCHAR(64) NULL COMMENT ''关联业务单号(幂等键/ref_id)''',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Normalize empty-string refs to NULL so uniqueness only applies to real refs
UPDATE user_balance_log
SET related_order_id = NULL
WHERE related_order_id IS NOT NULL AND related_order_id = '';

-- Keep the earliest row per (user_id, change_type, related_order_id); null out duplicate refs
UPDATE user_balance_log AS dup
JOIN (
    SELECT user_id, change_type, related_order_id, MIN(id) AS keep_id
    FROM user_balance_log
    WHERE related_order_id IS NOT NULL AND related_order_id <> ''
    GROUP BY user_id, change_type, related_order_id
    HAVING COUNT(*) > 1
) AS keepers
  ON dup.user_id = keepers.user_id
 AND dup.change_type = keepers.change_type
 AND dup.related_order_id = keepers.related_order_id
 AND dup.id <> keepers.keep_id
SET dup.related_order_id = NULL;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_balance_log' AND INDEX_NAME = 'uk_user_balance_log_idempotency') = 0,
    'CREATE UNIQUE INDEX uk_user_balance_log_idempotency ON user_balance_log (user_id, change_type, related_order_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

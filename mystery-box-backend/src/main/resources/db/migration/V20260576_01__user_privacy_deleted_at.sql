-- PDPL foundation: soft-delete marker for account deletion requests.
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE `user` ADD COLUMN deleted_at DATETIME(6) NULL COMMENT ''account soft-delete timestamp''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND INDEX_NAME = 'idx_user_deleted_at') = 0,
    'CREATE INDEX idx_user_deleted_at ON `user` (deleted_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

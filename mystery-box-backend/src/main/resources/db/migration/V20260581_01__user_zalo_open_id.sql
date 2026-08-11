-- Zalo OAuth login: bind users by Zalo open id.
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'zalo_open_id') = 0,
    'ALTER TABLE `user` ADD COLUMN zalo_open_id VARCHAR(64) NULL COMMENT ''Zalo user id (open id)'' AFTER phone',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND INDEX_NAME = 'uk_user_zalo_open_id') = 0,
    'CREATE UNIQUE INDEX uk_user_zalo_open_id ON `user` (zalo_open_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

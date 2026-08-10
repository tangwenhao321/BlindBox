-- Phase 2: newcomer missions, community order link, hint card balance
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'community_post' AND COLUMN_NAME = 'order_id') = 0,
    'ALTER TABLE community_post ADD COLUMN order_id VARCHAR(32) NULL COMMENT ''optional linked mystery box order''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'hint_cards') = 0,
    'ALTER TABLE `user` ADD COLUMN hint_cards INT NOT NULL DEFAULT 0 COMMENT ''提示卡余额''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS user_newcomer_mission (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    day_index INT NOT NULL COMMENT '1-7',
    claimed TINYINT(1) NOT NULL DEFAULT 0,
    claimed_at DATETIME(6) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_newcomer_day (user_id, day_index),
    KEY idx_user_newcomer_user (user_id)
);

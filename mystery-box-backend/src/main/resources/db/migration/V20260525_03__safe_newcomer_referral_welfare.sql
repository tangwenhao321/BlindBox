-- Idempotent patch for environments where V20260525_01 partially applied or was skipped.

SET @db = DATABASE();

SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box' AND COLUMN_NAME = 'newcomer_exclusive');
SET @sql = IF(@cnt = 0,
              'ALTER TABLE mystery_box ADD COLUMN newcomer_exclusive TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''新人专享盲盒''',
              'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'invite_code');
SET @sql = IF(@cnt = 0,
              'ALTER TABLE `user` ADD COLUMN invite_code VARCHAR(16) NULL COMMENT ''邀请码''',
              'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'inviter_id');
SET @sql = IF(@cnt = 0,
              'ALTER TABLE `user` ADD COLUMN inviter_id VARCHAR(64) NULL COMMENT ''邀请人''',
              'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'lucky_coins');
SET @sql = IF(@cnt = 0,
              'ALTER TABLE `user` ADD COLUMN lucky_coins INT NOT NULL DEFAULT 0 COMMENT ''幸运币''',
              'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cnt = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user' AND COLUMN_NAME = 'star_stones');
SET @sql = IF(@cnt = 0,
              'ALTER TABLE `user` ADD COLUMN star_stones INT NOT NULL DEFAULT 0 COMMENT ''星石''',
              'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS referral_commission_record (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL COMMENT '获得佣金的用户',
    source_user_id VARCHAR(64) NULL COMMENT '下级用户',
    order_id VARCHAR(64) NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    remark VARCHAR(255) NOT NULL DEFAULT '',
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL,
    INDEX idx_referral_commission_user (user_id),
    INDEX idx_referral_commission_created (created_time)
);

CREATE TABLE IF NOT EXISTS user_check_in (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    check_in_date DATE NOT NULL,
    reward_coins INT NOT NULL DEFAULT 10,
    created_time DATETIME NOT NULL,
    UNIQUE KEY uk_user_check_in_day (user_id, check_in_date)
);

CREATE TABLE IF NOT EXISTS user_favorite (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    mystery_box_id VARCHAR(64) NOT NULL,
    created_time DATETIME NOT NULL,
    UNIQUE KEY uk_user_favorite (user_id, mystery_box_id)
);

ALTER TABLE mystery_box
    ADD COLUMN newcomer_exclusive TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新人专享盲盒';

ALTER TABLE `user`
    ADD COLUMN invite_code VARCHAR(16) NULL COMMENT '邀请码',
    ADD COLUMN inviter_id VARCHAR(64) NULL COMMENT '邀请人',
    ADD COLUMN lucky_coins INT NOT NULL DEFAULT 0 COMMENT '幸运币',
    ADD COLUMN star_stones INT NOT NULL DEFAULT 0 COMMENT '星石';

CREATE UNIQUE INDEX uk_user_invite_code ON `user` (invite_code);

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

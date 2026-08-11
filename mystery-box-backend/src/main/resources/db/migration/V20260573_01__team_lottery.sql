-- 对对碰 team lottery (Doc1).
CREATE TABLE IF NOT EXISTS team_lottery (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    host_user_id VARCHAR(32) NOT NULL,
    box_id VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    draw_quota INT NOT NULL DEFAULT 0,
    draws_used INT NOT NULL DEFAULT 0,
    invite_code VARCHAR(16) NOT NULL,
    device_fingerprint_host VARCHAR(128) NULL,
    expire_time DATETIME(6) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_team_lottery_invite (invite_code),
    KEY idx_team_lottery_host (host_user_id, status),
    KEY idx_team_lottery_expire (status, expire_time)
);

CREATE TABLE IF NOT EXISTS team_lottery_member (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    team_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    device_id VARCHAR(128) NULL,
    phone_hash VARCHAR(64) NULL,
    ip VARCHAR(64) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    joined_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_team_member (team_id, user_id),
    KEY idx_team_member_user (user_id, status),
    KEY idx_team_member_device (device_id, status),
    KEY idx_team_member_phone (phone_hash, status),
    KEY idx_team_member_ip (ip, status)
);

CREATE TABLE IF NOT EXISTS team_lottery_draw (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    team_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    order_id VARCHAR(32) NULL,
    result_json TEXT,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_team_draw_team (team_id, created_time)
);

CREATE TABLE IF NOT EXISTS team_lottery_chat (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    team_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    msg_type VARCHAR(16) NOT NULL DEFAULT 'TEXT',
    body VARCHAR(512) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_team_chat_team (team_id, created_time)
);

CREATE TABLE IF NOT EXISTS team_lottery_boost (
    user_id VARCHAR(32) NOT NULL,
    box_id VARCHAR(32) NOT NULL,
    boost_count INT NOT NULL DEFAULT 0,
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, box_id)
);

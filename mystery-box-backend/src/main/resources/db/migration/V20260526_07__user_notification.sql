CREATE TABLE IF NOT EXISTS user_notification (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    category VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    body VARCHAR(512) NOT NULL,
    ref_id VARCHAR(64) NULL,
    read_flag TINYINT(1) NOT NULL DEFAULT 0,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_notification_user (user_id, read_flag, created_time)
);

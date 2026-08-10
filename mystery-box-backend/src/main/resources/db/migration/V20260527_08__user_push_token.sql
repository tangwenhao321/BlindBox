CREATE TABLE IF NOT EXISTS user_push_token (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    platform VARCHAR(16) NULL,
    updated_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_push_user (user_id),
    INDEX idx_push_token_user (user_id)
);

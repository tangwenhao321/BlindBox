CREATE TABLE IF NOT EXISTS hint_policy_config (
    id              VARCHAR(64)  NOT NULL PRIMARY KEY,
    config_key      VARCHAR(64)  NOT NULL,
    config_value    INT          NOT NULL,
    description     VARCHAR(255) NULL,
    created_time    DATETIME     NULL,
    updated_time    DATETIME     NULL,
    UNIQUE KEY uk_hint_policy_config_key (config_key)
);

INSERT INTO hint_policy_config (id, config_key, config_value, description, created_time, updated_time)
VALUES ('hint-daily-limit', 'hint_daily_limit', 20, 'Max hint uses per user per calendar day', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_time = NOW();

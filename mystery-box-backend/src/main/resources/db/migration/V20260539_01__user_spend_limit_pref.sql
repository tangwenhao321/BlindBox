CREATE TABLE IF NOT EXISTS user_spend_limit_pref (
    user_id VARCHAR(32) NOT NULL PRIMARY KEY,
    daily_limit DECIMAL(12, 2) NULL COMMENT 'user cap <= server daily',
    monthly_limit DECIMAL(12, 2) NULL COMMENT 'user cap <= server monthly',
    cooling_off_until DATETIME(6) NULL COMMENT 'no orders until this time after preference change',
    updated_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

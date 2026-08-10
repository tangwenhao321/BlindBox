-- Draw fairness audit fields (MySQL 8.0 compatible — no ADD COLUMN IF NOT EXISTS)
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND COLUMN_NAME = 'fairness_seed') = 0,
    'ALTER TABLE mystery_box_draw_log ADD COLUMN fairness_seed VARCHAR(64) NULL COMMENT ''server seed for verify''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND COLUMN_NAME = 'fairness_hash') = 0,
    'ALTER TABLE mystery_box_draw_log ADD COLUMN fairness_hash VARCHAR(128) NULL COMMENT ''sha256(seed|order|product|time)''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- User compliance (age gate server-side)
CREATE TABLE IF NOT EXISTS user_compliance (
    user_id VARCHAR(32) NOT NULL PRIMARY KEY,
    age_confirmed_at DATETIME(6) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

-- Push device tokens (legacy table name; app uses user_push_token from V08 when present)
CREATE TABLE IF NOT EXISTS user_device_token (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    push_token VARCHAR(512) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_token (user_id, push_token)
);

-- C2C marketplace (official escrow-lite: list from warehouse prizes)
CREATE TABLE IF NOT EXISTS marketplace_listing (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    seller_user_id VARCHAR(32) NOT NULL,
    mystery_box_order_id VARCHAR(32) NOT NULL,
    mystery_box_order_item_id VARCHAR(32) NULL,
    product_id VARCHAR(32) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    cover VARCHAR(512) NULL,
    quality_type VARCHAR(32) NULL,
    price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ON_SALE',
    buyer_user_id VARCHAR(32) NULL,
    sold_time DATETIME(6) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    KEY idx_market_status (status, created_time)
);

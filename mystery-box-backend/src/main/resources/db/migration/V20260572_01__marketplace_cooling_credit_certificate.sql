-- Marketplace cooling-off, credit score, certificates, expect-swap fields.
CREATE TABLE IF NOT EXISTS marketplace_trade (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    listing_id VARCHAR(32) NOT NULL,
    seller_user_id VARCHAR(32) NOT NULL,
    buyer_user_id VARCHAR(32) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_COOLING',
    cooling_until DATETIME(6) NOT NULL,
    settled_time DATETIME(6) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    KEY idx_market_trade_status_cooling (status, cooling_until),
    KEY idx_market_trade_buyer (buyer_user_id, status)
);

CREATE TABLE IF NOT EXISTS user_market_credit (
    user_id VARCHAR(32) NOT NULL PRIMARY KEY,
    score DECIMAL(4,2) NOT NULL DEFAULT 5.00,
    trade_count INT NOT NULL DEFAULT 0,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS marketplace_certificate (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    listing_id VARCHAR(32) NOT NULL,
    product_unique_id VARCHAR(64) NOT NULL,
    ip_license_text VARCHAR(512) NOT NULL DEFAULT '',
    trade_history_json TEXT,
    video_url VARCHAR(512) NOT NULL DEFAULT '',
    review_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_market_cert_listing (listing_id)
);

CREATE TABLE IF NOT EXISTS marketplace_trade_rating (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    trade_id VARCHAR(32) NOT NULL,
    from_user_id VARCHAR(32) NOT NULL,
    to_user_id VARCHAR(32) NOT NULL,
    score INT NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_market_rating (trade_id, from_user_id)
);

SET @db := DATABASE();
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND COLUMN_NAME = 'expect_swap_product_id') = 0,
    'ALTER TABLE marketplace_listing ADD COLUMN expect_swap_product_id VARCHAR(32) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND COLUMN_NAME = 'expect_points') = 0,
    'ALTER TABLE marketplace_listing ADD COLUMN expect_points INT NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS marketplace_listing_chat (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    listing_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    msg_type VARCHAR(16) NOT NULL DEFAULT 'TEXT',
    body VARCHAR(512) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_marketplace_listing_chat (listing_id, created_time)
);

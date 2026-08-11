-- Marketplace external payout safety: align trade columns + admin menu.
-- MarketplaceService uses seller_id/buyer_id/seller_proceeds (not seller_user_id/buyer_user_id).

SET @db := DATABASE();

-- Rename seller_user_id -> seller_id when legacy column exists
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'seller_user_id') > 0
    AND (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'seller_id') = 0,
    'ALTER TABLE marketplace_trade CHANGE COLUMN seller_user_id seller_id VARCHAR(32) NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'buyer_user_id') > 0
    AND (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'buyer_id') = 0,
    'ALTER TABLE marketplace_trade CHANGE COLUMN buyer_user_id buyer_id VARCHAR(32) NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'seller_proceeds') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN seller_proceeds DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER fee',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'buyer_rated') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN buyer_rated TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'seller_rated') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN seller_rated TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'buyer_credit_score') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN buyer_credit_score DECIMAL(4,2) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND COLUMN_NAME = 'seller_credit_score') = 0,
    'ALTER TABLE marketplace_trade ADD COLUMN seller_credit_score DECIMAL(4,2) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_trade' AND INDEX_NAME = 'idx_market_trade_pending_ext') = 0,
    'CREATE INDEX idx_market_trade_pending_ext ON marketplace_trade (status, edited_time)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-marketplace-trades-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '集市外部打款', '/marketplace-pending-external', 'mb-ops-dir-001', 7, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/marketplace-pending-external');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-marketplace-trades-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-marketplace-trades-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-marketplace-trades-rel-001');

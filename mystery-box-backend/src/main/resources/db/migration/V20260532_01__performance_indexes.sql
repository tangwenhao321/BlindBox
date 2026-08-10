-- Hot-path indexes for warehouse, marketplace, community, orders

SET @db := DATABASE();

-- warehouse_ship_request(user_id, status, created_time)
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'warehouse_ship_request' AND INDEX_NAME = 'idx_wsr_user_status_time') = 0,
    'CREATE INDEX idx_wsr_user_status_time ON warehouse_ship_request (user_id, status, created_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- marketplace_listing ON_SALE browse
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND INDEX_NAME = 'idx_ml_status_created') = 0,
    'CREATE INDEX idx_ml_status_created ON marketplace_listing (status, created_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'marketplace_listing' AND INDEX_NAME = 'idx_ml_buyer_sold') = 0,
    'CREATE INDEX idx_ml_buyer_sold ON marketplace_listing (buyer_user_id, status, sold_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- community
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'community_post' AND INDEX_NAME = 'idx_cp_status_time') = 0,
    'CREATE INDEX idx_cp_status_time ON community_post (status, created_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'community_comment' AND INDEX_NAME = 'idx_cc_post_time') = 0,
    'CREATE INDEX idx_cc_post_time ON community_comment (post_id, created_time ASC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'community_like' AND INDEX_NAME = 'idx_cl_post') = 0,
    'CREATE INDEX idx_cl_post ON community_like (post_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- refund / retention
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'refund_record' AND INDEX_NAME = 'idx_refund_creator_time') = 0,
    'CREATE INDEX idx_refund_creator_time ON refund_record (creator_id, created_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

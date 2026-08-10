SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_order' AND INDEX_NAME = 'idx_mystery_box_order_status_created') = 0,
    'CREATE INDEX idx_mystery_box_order_status_created ON mystery_box_order (status, created_time)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'analytics_event' AND INDEX_NAME = 'idx_analytics_event_name_at') = 0,
    'CREATE INDEX idx_analytics_event_name_at ON analytics_event (event_name, event_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_notification' AND INDEX_NAME = 'idx_user_notification_user_ref_category') = 0,
    'CREATE INDEX idx_user_notification_user_ref_category ON user_notification (user_id, ref_id, category)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'search_hot_keyword' AND INDEX_NAME = 'idx_search_hot_keyword_enabled_sort') = 0,
    'CREATE INDEX idx_search_hot_keyword_enabled_sort ON search_hot_keyword (enabled, sort_order)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

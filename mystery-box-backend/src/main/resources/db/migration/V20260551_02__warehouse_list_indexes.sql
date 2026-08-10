SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'base_order' AND INDEX_NAME = 'idx_bo_creator_id') = 0,
    'CREATE INDEX idx_bo_creator_id ON base_order (creator_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_order_item' AND INDEX_NAME = 'idx_moi_order_id') = 0,
    'CREATE INDEX idx_moi_order_id ON mystery_box_order_item (mystery_box_order_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_order' AND INDEX_NAME = 'idx_mbo_status_created') = 0,
    'CREATE INDEX idx_mbo_status_created ON mystery_box_order (status, created_time DESC)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

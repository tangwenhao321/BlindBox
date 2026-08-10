SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND INDEX_NAME = 'idx_draw_log_created_time') = 0,
    'CREATE INDEX idx_draw_log_created_time ON mystery_box_draw_log (created_time)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND INDEX_NAME = 'idx_draw_log_time_quality') = 0,
    'CREATE INDEX idx_draw_log_time_quality ON mystery_box_draw_log (created_time, quality_type)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND INDEX_NAME = 'idx_draw_log_box_time_quality') = 0,
    'CREATE INDEX idx_draw_log_box_time_quality ON mystery_box_draw_log (mystery_box_id, created_time, quality_type)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_draw_log' AND INDEX_NAME = 'idx_draw_log_order') = 0,
    'CREATE INDEX idx_draw_log_order ON mystery_box_draw_log (mystery_box_order_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

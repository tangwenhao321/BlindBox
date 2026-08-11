-- Draw rate audit trail + pity compensation status for forceHigh stock exhaustion.

CREATE TABLE IF NOT EXISTS draw_audit_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    box_id VARCHAR(32) NOT NULL,
    order_id VARCHAR(32) NOT NULL,
    base_rates TEXT NOT NULL COMMENT 'JSON: legendary/hidden/general base rates',
    adjusted_rates TEXT NOT NULL COMMENT 'JSON: rates after DynamicProbabilityAdjuster',
    config_version VARCHAR(64) NULL COMMENT 'box edited_time or rate config stamp',
    result_product_id VARCHAR(32) NULL,
    result_tier VARCHAR(32) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_draw_audit_user_box (user_id, box_id, created_time),
    KEY idx_draw_audit_order (order_id),
    KEY idx_draw_audit_box_time (box_id, created_time)
);

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_user_pity' AND COLUMN_NAME = 'compensate_status') = 0,
    'ALTER TABLE mystery_box_user_pity ADD COLUMN compensate_status VARCHAR(16) NULL COMMENT ''NONE/PENDING/WAIT/POINTS/DONE''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_user_pity' AND COLUMN_NAME = 'compensate_choice') = 0,
    'ALTER TABLE mystery_box_user_pity ADD COLUMN compensate_choice VARCHAR(16) NULL COMMENT ''WAIT or POINTS''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'mystery_box_user_pity' AND COLUMN_NAME = 'compensate_time') = 0,
    'ALTER TABLE mystery_box_user_pity ADD COLUMN compensate_time DATETIME(6) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

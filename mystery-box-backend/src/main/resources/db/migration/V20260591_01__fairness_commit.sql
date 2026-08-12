-- Pre-reveal fairness commit = sha256(fairness_seed); seed stays server-only until draw logs reveal it.
SET @db = DATABASE();
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'order_draw_meta' AND COLUMN_NAME = 'fairness_commit') = 0,
    'ALTER TABLE order_draw_meta ADD COLUMN fairness_commit VARCHAR(128) NULL COMMENT ''sha256(seed) commit before reveal'' AFTER fairness_seed',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

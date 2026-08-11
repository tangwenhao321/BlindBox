-- Team lottery: one paid order can only consume one draw.
-- Fragment log: idempotency key for decompose / exchange races.

SET @db := DATABASE();

-- Drop duplicate team draws keeping the earliest row per order_id
DELETE d1 FROM team_lottery_draw d1
INNER JOIN team_lottery_draw d2
  ON d1.order_id = d2.order_id
 AND d1.order_id IS NOT NULL
 AND d1.order_id <> ''
 AND d1.created_time > d2.created_time;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'team_lottery_draw' AND INDEX_NAME = 'uk_team_lottery_draw_order') = 0,
    'CREATE UNIQUE INDEX uk_team_lottery_draw_order ON team_lottery_draw (order_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_fragment_log' AND COLUMN_NAME = 'idempotency_key') = 0,
    'ALTER TABLE user_fragment_log ADD COLUMN idempotency_key VARCHAR(96) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_fragment_log' AND INDEX_NAME = 'uk_user_fragment_log_idem') = 0,
    'CREATE UNIQUE INDEX uk_user_fragment_log_idem ON user_fragment_log (idempotency_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

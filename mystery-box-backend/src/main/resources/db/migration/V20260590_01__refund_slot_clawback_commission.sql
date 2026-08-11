-- Open refund uniqueness + draw meta slot_no + referral clawback debt + commission unique.

SET @db := DATABASE();

-- One open (REFUNDING) refund per order (MySQL functional unique via generated column).
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'refund_record' AND COLUMN_NAME = 'open_order_key') = 0,
    'ALTER TABLE refund_record ADD COLUMN open_order_key VARCHAR(32)
        GENERATED ALWAYS AS (CASE WHEN status = ''REFUNDING'' THEN order_id ELSE NULL END) STORED,
      ADD UNIQUE KEY uk_refund_open_order (open_order_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'order_draw_meta' AND COLUMN_NAME = 'slot_no') = 0,
    'ALTER TABLE order_draw_meta ADD COLUMN slot_no INT NULL COMMENT ''cabinet slot persisted'' AFTER pool_reserved',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'referral_clawback_debt') = 0,
    'CREATE TABLE referral_clawback_debt (
        order_id VARCHAR(32) NOT NULL PRIMARY KEY,
        inviter_user_id VARCHAR(32) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT ''OPEN'',
        created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_clawback_inviter (inviter_user_id, status)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Deduplicate commission rows then unique order_id.
DELETE t1 FROM referral_commission_record t1
INNER JOIN referral_commission_record t2
  ON t1.order_id = t2.order_id AND t1.id > t2.id;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'referral_commission_record' AND INDEX_NAME = 'uk_referral_commission_order') = 0,
    'ALTER TABLE referral_commission_record ADD UNIQUE KEY uk_referral_commission_order (order_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

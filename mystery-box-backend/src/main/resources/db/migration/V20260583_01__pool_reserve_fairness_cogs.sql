-- Pool reserve / fairness / COGS for profitability wave
-- order_draw_meta: durable fairness seed (survives Redis TTL)
CREATE TABLE IF NOT EXISTS order_draw_meta (
    order_id VARCHAR(32) NOT NULL PRIMARY KEY,
    fairness_seed VARCHAR(64) NOT NULL,
    pool_reserved TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 when pool units reserved at create',
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

-- Optional COGS for EV gate (NULL = use retail price as conservative proxy)
SET @db := DATABASE();
SET @sql := (
    SELECT IF(
        (SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product' AND COLUMN_NAME = 'cost_price') = 0,
        'ALTER TABLE product ADD COLUMN cost_price DECIMAL(12,2) NULL COMMENT ''COGS for EV gate; null uses retail price'' AFTER price',
        'SELECT 1'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

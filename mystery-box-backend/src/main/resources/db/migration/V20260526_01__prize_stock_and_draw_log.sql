ALTER TABLE mystery_box_product_rel
    ADD COLUMN stock_total INT NOT NULL DEFAULT 10 COMMENT '赏品总库存',
    ADD COLUMN stock_remaining INT NOT NULL DEFAULT 10 COMMENT '赏品剩余库存',
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '展示排序',
    ADD COLUMN is_last_one TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否终赏';

UPDATE mystery_box_product_rel SET stock_total = 10, stock_remaining = 10 WHERE stock_remaining = 0 OR stock_total = 0;

CREATE TABLE IF NOT EXISTS mystery_box_draw_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    mystery_box_id VARCHAR(32) NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    product_name VARCHAR(255) NULL,
    quality_type VARCHAR(32) NULL,
    mystery_box_order_id VARCHAR(32) NULL,
    is_last_one TINYINT(1) NOT NULL DEFAULT 0,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_draw_log_box_time (mystery_box_id, created_time DESC),
    INDEX idx_draw_log_user (user_id)
);

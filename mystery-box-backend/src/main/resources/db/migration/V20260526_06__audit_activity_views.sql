CREATE TABLE IF NOT EXISTS prize_stock_audit_log (
    id VARCHAR(32) PRIMARY KEY,
    rel_id VARCHAR(32) NOT NULL,
    mystery_box_id VARCHAR(32) NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    stock_total_before INT NULL,
    stock_remaining_before INT NULL,
    stock_total_after INT NOT NULL,
    stock_remaining_after INT NOT NULL,
    is_last_one_after TINYINT(1) NOT NULL DEFAULT 0,
    operator_id VARCHAR(32) NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prize_stock_audit_box (mystery_box_id, created_time)
);

ALTER TABLE mystery_box_activity
    ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0;

-- Phase 3: cabinet pool slots for per-box selection
CREATE TABLE IF NOT EXISTS mystery_box_pool_slot (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    mystery_box_id VARCHAR(32) NOT NULL,
    slot_no INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE|RESERVED|SOLD',
    reserved_by_user_id VARCHAR(32) NULL,
    reserved_until DATETIME(6) NULL,
    order_id VARCHAR(32) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_box_slot (mystery_box_id, slot_no),
    KEY idx_box_status (mystery_box_id, status),
    KEY idx_reserved_user (mystery_box_id, reserved_by_user_id)
);

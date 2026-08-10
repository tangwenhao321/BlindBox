CREATE TABLE IF NOT EXISTS warehouse_ship_request (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    address_id VARCHAR(32) NOT NULL,
    address_snapshot VARCHAR(512) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    item_count INT NOT NULL DEFAULT 0,
    product_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pay_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tracking_number VARCHAR(64) NULL,
    remark VARCHAR(255) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    KEY idx_warehouse_ship_user (user_id, created_time)
);

CREATE TABLE IF NOT EXISTS warehouse_ship_request_item (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    request_id VARCHAR(32) NOT NULL,
    order_id VARCHAR(32) NOT NULL,
    order_item_id VARCHAR(32) NULL,
    product_id VARCHAR(32) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    source VARCHAR(16) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_warehouse_ship_req (request_id)
);

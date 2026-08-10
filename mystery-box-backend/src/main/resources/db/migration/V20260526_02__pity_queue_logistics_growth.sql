CREATE TABLE IF NOT EXISTS mystery_box_user_pity (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    mystery_box_id VARCHAR(32) NOT NULL,
    draws_since_high INT NOT NULL DEFAULT 0,
    pity_threshold INT NOT NULL DEFAULT 50,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_box_pity (user_id, mystery_box_id)
);

ALTER TABLE mystery_box
    ADD COLUMN pity_threshold INT NOT NULL DEFAULT 50 COMMENT '用户保底阈值';

CREATE TABLE IF NOT EXISTS order_logistics_event (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    description VARCHAR(500) NOT NULL,
    event_time DATETIME(6) NOT NULL,
    operator VARCHAR(64) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_logistics_order (order_id, event_time)
);

CREATE TABLE IF NOT EXISTS user_fragment (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    fragment_code VARCHAR(64) NOT NULL DEFAULT 'default',
    balance INT NOT NULL DEFAULT 0,
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_fragment (user_id, fragment_code)
);

CREATE TABLE IF NOT EXISTS user_fragment_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    change_amount INT NOT NULL,
    balance_after INT NOT NULL,
    remark VARCHAR(255) NULL,
    related_order_item_id VARCHAR(32) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_fragment_log_user (user_id, created_time DESC)
);

CREATE TABLE IF NOT EXISTS fragment_exchange_sku (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    cover VARCHAR(512) NULL,
    fragment_cost INT NOT NULL DEFAULT 100,
    stock_remaining INT NOT NULL DEFAULT 999,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS mystery_box_activity (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    banner VARCHAR(512) NULL,
    subtitle VARCHAR(255) NULL,
    end_time DATETIME(6) NOT NULL,
    box_ids JSON NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

INSERT INTO fragment_exchange_sku (id, name, cover, fragment_cost, stock_remaining, enabled, sort_order)
SELECT 'sku-default-1', '进阶兑换示例券', NULL, 50, 999, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM fragment_exchange_sku WHERE id = 'sku-default-1');

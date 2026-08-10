CREATE TABLE IF NOT EXISTS mystery_box_draw_pack_config (
    id              VARCHAR(64)  NOT NULL PRIMARY KEY,
    draw_count      INT          NOT NULL,
    label           VARCHAR(64)  NOT NULL,
    discount_rate   INT          NOT NULL DEFAULT 10000 COMMENT '万分比，10000=无折扣，9850=98.5折',
    enabled         TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_time    DATETIME     NULL,
    updated_time    DATETIME     NULL,
    UNIQUE KEY uk_draw_count (draw_count)
);

INSERT INTO mystery_box_draw_pack_config (id, draw_count, label, discount_rate, enabled, sort_order, created_time, updated_time)
VALUES
    ('pack-1', 1, '一发入魂', 10000, 1, 1, NOW(), NOW()),
    ('pack-5', 5, '霸气五连', 9850, 1, 2, NOW(), NOW()),
    ('pack-10', 10, '豪气十连', 9700, 1, 3, NOW(), NOW()),
    ('pack-50', 50, '欧皇五十连', 9600, 1, 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_time = NOW();

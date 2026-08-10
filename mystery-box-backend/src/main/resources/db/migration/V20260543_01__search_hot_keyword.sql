CREATE TABLE IF NOT EXISTS search_hot_keyword (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    keyword VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_search_hot_keyword (keyword)
);

INSERT INTO search_hot_keyword (id, keyword, sort_order, enabled, created_time)
VALUES
    ('shk-1', '一番赏', 1, 1, NOW()),
    ('shk-2', '手办', 2, 1, NOW()),
    ('shk-3', '新品', 3, 1, NOW()),
    ('shk-4', '限定', 4, 1, NOW())
ON DUPLICATE KEY UPDATE keyword = VALUES(keyword);

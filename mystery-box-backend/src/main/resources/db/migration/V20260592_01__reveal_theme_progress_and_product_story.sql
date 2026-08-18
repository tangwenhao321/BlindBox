-- Account-scoped unbox theme progress (survives device change) + Vietnamese IP story on SKUs.

CREATE TABLE IF NOT EXISTS user_reveal_theme_progress (
    user_id VARCHAR(32) NOT NULL PRIMARY KEY,
    open_count INT NOT NULL DEFAULT 0,
    has_hidden TINYINT(1) NOT NULL DEFAULT 0,
    series_complete TINYINT(1) NOT NULL DEFAULT 0,
    equipped_theme_id VARCHAR(64) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS user_reveal_theme_open (
    user_id VARCHAR(32) NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, order_id),
    INDEX idx_reveal_theme_open_user (user_id, created_time)
);

-- Seed adventure copy only when ops has not set attributes yet. Client falls back to locale templates.
UPDATE product
SET attributes = JSON_ARRAY(
        JSON_OBJECT('name', 'storyTitle', 'values', JSON_ARRAY(CONCAT('Kho báu lộ diện · ', name))),
        JSON_OBJECT(
                'name', 'storyBody',
                'values', JSON_ARRAY(CONCAT(
                        'Trong huyền thoại Việt, ', name,
                        ' từng là tín vật được cất trong hộp sơn mài. Mỗi lần mở hộp là một lần ký ức trở về.'
                                     ))
        ),
        JSON_OBJECT('name', 'storyTagline', 'values', JSON_ARRAY(CONCAT('Mở hộp — ', name, ' hiện hình')))
                 )
WHERE attributes IS NULL
   OR attributes = 'null'
   OR TRIM(CAST(attributes AS CHAR)) IN ('', '[]');

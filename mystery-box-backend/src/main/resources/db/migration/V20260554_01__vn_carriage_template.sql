-- VN nationwide flat carriage template (30000 VND)

CREATE TABLE IF NOT EXISTS carriage_template (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    valid TINYINT(1) NOT NULL DEFAULT 0,
    configs TEXT NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    edited_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    creator_id VARCHAR(32) NULL,
    editor_id VARCHAR(32) NULL
);

UPDATE carriage_template SET valid = 0 WHERE valid = 1;

INSERT INTO carriage_template (
    id, created_time, edited_time, creator_id, editor_id, name, description, configs, valid
)
SELECT
    'vn-carriage-nationwide',
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6),
    '0f07d638f1bc401188d86dc650ab06a7',
    '0f07d638f1bc401188d86dc650ab06a7',
    'VN Nationwide Flat',
    'Flat 30000 VND shipping for Vietnam market',
    '[{"province":["Thành phố Hà Nội","Thành phố Hồ Chí Minh","*"],"priceRanges":[{"minPrice":0,"maxPrice":999999999,"carriage":30000}]}]',
    1
WHERE NOT EXISTS (SELECT 1 FROM carriage_template WHERE id = 'vn-carriage-nationwide');

UPDATE carriage_template
SET valid = 1,
    configs = '[{"province":["Thành phố Hà Nội","Thành phố Hồ Chí Minh","*"],"priceRanges":[{"minPrice":0,"maxPrice":999999999,"carriage":30000}]}]',
    edited_time = CURRENT_TIMESTAMP(6)
WHERE id = 'vn-carriage-nationwide';

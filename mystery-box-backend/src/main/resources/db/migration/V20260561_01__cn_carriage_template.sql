-- CN default carriage: VN template wildcard was matching all CN addresses at 30000 CNY freight.

UPDATE carriage_template SET valid = 0 WHERE id = 'vn-carriage-nationwide';

INSERT INTO carriage_template (
    id, created_time, edited_time, creator_id, editor_id, name, description, configs, valid
)
SELECT
    'cn-carriage-default',
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6),
    '0f07d638f1bc401188d86dc650ab06a7',
    '0f07d638f1bc401188d86dc650ab06a7',
    'CN Nationwide Default',
    'Flat 12 CNY shipping for China market (blind-box orders)',
    '[{"province":["*"],"priceRanges":[{"minPrice":0,"maxPrice":999999999,"carriage":12}]}]',
    1
WHERE NOT EXISTS (SELECT 1 FROM carriage_template WHERE id = 'cn-carriage-default');

UPDATE carriage_template
SET valid = 1,
    configs = '[{"province":["*"],"priceRanges":[{"minPrice":0,"maxPrice":999999999,"carriage":12}]}]',
    edited_time = CURRENT_TIMESTAMP(6)
WHERE id = 'cn-carriage-default';

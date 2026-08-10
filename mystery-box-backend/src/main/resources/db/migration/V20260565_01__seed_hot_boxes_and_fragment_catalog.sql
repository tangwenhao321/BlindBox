-- Seed home hot-box carousel and fragment exchange catalog when ops data is sparse.
-- id columns are VARCHAR(32); use short generated ids.

INSERT INTO ops_home_hot_box (id, mystery_box_id, sort_order, enabled, created_time)
SELECT CONCAT('hot', LPAD(mb.rn, 2, '0')), mb.id, mb.rn, 1, CURRENT_TIMESTAMP(6)
FROM (
    SELECT mb2.id, (@hot_rn := @hot_rn + 1) AS rn
    FROM mystery_box mb2, (SELECT @hot_rn := 0) init
    ORDER BY mb2.edited_time DESC
    LIMIT 8
) mb
WHERE NOT EXISTS (
    SELECT 1 FROM ops_home_hot_box h WHERE h.mystery_box_id = mb.id
);

INSERT INTO fragment_exchange_sku (id, name, cover, fragment_cost, stock_remaining, enabled, sort_order)
SELECT
    CONCAT('fex', LPAD(seq.rn, 2, '0')),
    p.name,
    p.cover,
    CASE UPPER(p.quality_type)
        WHEN 'LEGENDARY' THEN 180
        WHEN 'LEGEND' THEN 180
        WHEN 'HIDDEN' THEN 120
        WHEN 'EPIC' THEN 90
        WHEN 'RARE' THEN 60
        ELSE 35
    END,
    99,
    1,
    (SELECT COALESCE(MAX(sort_order), 0) FROM fragment_exchange_sku) + seq.rn
FROM product p
JOIN (
    SELECT p2.id, (@frag_rn := @frag_rn + 1) AS rn
    FROM product p2, (SELECT @frag_rn := 0) init
    ORDER BY p2.edited_time DESC
    LIMIT 15
) seq ON seq.id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM fragment_exchange_sku s WHERE s.id = CONCAT('fex', LPAD(seq.rn, 2, '0'))
);

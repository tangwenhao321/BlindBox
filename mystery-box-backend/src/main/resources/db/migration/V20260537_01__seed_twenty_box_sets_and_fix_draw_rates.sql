-- 补 20 套盲盒、修正异常概率/保底阈值、保证奖池含普通赏

DELETE FROM mystery_box_product_rel WHERE mystery_box_id LIKE 'mb-set-%';
DELETE FROM mystery_box WHERE id LIKE 'mb-set-%';

UPDATE mystery_box
SET legendary_rate = 100,
    hidden_rate = 500,
    general_rate = 9400
WHERE legendary_rate + hidden_rate + general_rate != 10000;

UPDATE mystery_box
SET pity_threshold = 50
WHERE pity_threshold IS NULL OR pity_threshold < 2;

INSERT INTO mystery_box_category (id, name, sort_order, created_time, edited_time, creator_id, editor_id)
SELECT 'mb-cat-seed', '精选套系', 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), seed_user.id, seed_user.id
FROM (SELECT id FROM user ORDER BY created_time ASC LIMIT 1) seed_user
WHERE NOT EXISTS (SELECT 1 FROM mystery_box_category LIMIT 1)
  AND EXISTS (SELECT 1 FROM user LIMIT 1);

INSERT INTO mystery_box (
    id, name, details, tips, price,
    legendary_rate, hidden_rate, general_rate,
    cover, newcomer_exclusive, pool_total, pool_remaining, pity_threshold,
    category_id, created_time, edited_time, creator_id, editor_id
)
SELECT
    CONCAT('mb-set-', LPAD(s.n, 2, '0')),
    CONCAT('限定套系·', s.n),
    '精选赏品组合，概率已公示',
    '高人气套系',
    19.90 + (MOD(s.n, 5) * 10),
    100, 500, 9400,
    '', 0, 100, 100, 50,
    cat.id,
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6),
    seed_user.id,
    seed_user.id
FROM (
    SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
) s
CROSS JOIN (
    SELECT id FROM mystery_box_category ORDER BY sort_order ASC, created_time ASC LIMIT 1
) cat
CROSS JOIN (
    SELECT id FROM user ORDER BY created_time ASC LIMIT 1
) seed_user
WHERE NOT EXISTS (SELECT 1 FROM mystery_box WHERE id = CONCAT('mb-set-', LPAD(s.n, 2, '0')));

INSERT INTO mystery_box_product_rel (
    id, mystery_box_id, product_id, stock_total, stock_remaining, sort_order, is_last_one,
    created_time, edited_time, creator_id, editor_id
)
SELECT
    MD5(CONCAT(nb.id, '|', tr.product_id)),
    nb.id,
    tr.product_id,
    GREATEST(COALESCE(tr.stock_total, 0), 30),
    GREATEST(COALESCE(tr.stock_remaining, 0), 30),
    COALESCE(tr.sort_order, 0),
    COALESCE(tr.is_last_one, 0),
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6),
    COALESCE(tr.creator_id, seed_user.id),
    COALESCE(tr.editor_id, seed_user.id)
FROM mystery_box nb
CROSS JOIN (
    SELECT id FROM user ORDER BY created_time ASC LIMIT 1
) seed_user
CROSS JOIN (
    SELECT id FROM mystery_box ORDER BY created_time ASC LIMIT 1
) template_box
INNER JOIN mystery_box_product_rel tr ON tr.mystery_box_id = template_box.id
WHERE nb.id LIKE 'mb-set-%'
  AND NOT EXISTS (
      SELECT 1 FROM mystery_box_product_rel existing WHERE existing.mystery_box_id = nb.id
  );

UPDATE mystery_box mb
INNER JOIN (
    SELECT mystery_box_id,
           SUM(stock_remaining) AS sum_remaining,
           SUM(stock_total) AS sum_total
    FROM mystery_box_product_rel
    GROUP BY mystery_box_id
) agg ON agg.mystery_box_id = mb.id
SET mb.pool_remaining = agg.sum_remaining,
    mb.pool_total = agg.sum_total
WHERE mb.id LIKE 'mb-set-%';

UPDATE product p
INNER JOIN mystery_box_product_rel rel
    ON rel.product_id = p.id AND rel.mystery_box_id LIKE 'mb-set-%'
INNER JOIN (
    SELECT mystery_box_id, MIN(sort_order) AS min_sort
    FROM mystery_box_product_rel
    WHERE mystery_box_id LIKE 'mb-set-%'
    GROUP BY mystery_box_id
) first_rel
    ON first_rel.mystery_box_id = rel.mystery_box_id AND first_rel.min_sort = rel.sort_order
SET p.quality_type = 'GENERAL';

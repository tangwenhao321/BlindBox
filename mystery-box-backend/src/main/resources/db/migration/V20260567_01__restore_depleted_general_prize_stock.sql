-- 普通款库存被抽光会导致概率全部落到隐藏/传说，测试环境补回 GENERAL 余量
UPDATE mystery_box_product_rel mbpr
    JOIN product p ON p.id = mbpr.product_id
SET mbpr.stock_remaining = GREATEST(mbpr.stock_total, 30)
WHERE UPPER(p.quality_type) = 'GENERAL'
  AND mbpr.stock_remaining <= 0
  AND mbpr.stock_total > 0;

-- 奖池总余量过低时整体补满，避免连抽只能出同一品质
UPDATE mystery_box mb
    JOIN (
        SELECT mystery_box_id, SUM(stock_remaining) AS sum_remaining
        FROM mystery_box_product_rel
        GROUP BY mystery_box_id
        HAVING SUM(stock_remaining) < 20
    ) low ON low.mystery_box_id = mb.id
SET mb.pool_remaining = GREATEST(COALESCE(mb.pool_remaining, 0), 200),
    mb.pool_total = GREATEST(COALESCE(mb.pool_total, 0), 200);

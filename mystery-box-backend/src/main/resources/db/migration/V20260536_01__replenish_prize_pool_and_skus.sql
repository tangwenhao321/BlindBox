-- 补满奖池 SKU 库存并同步盲盒 pool 计数（解决「奖池已售罄 / 余量不足」）

UPDATE mystery_box_product_rel
SET stock_total = GREATEST(COALESCE(stock_total, 0), 50),
    stock_remaining = GREATEST(COALESCE(stock_remaining, 0), 50)
WHERE COALESCE(stock_remaining, 0) < 50;

UPDATE mystery_box mb
INNER JOIN (
    SELECT mystery_box_id,
           SUM(stock_remaining) AS sum_remaining,
           SUM(stock_total) AS sum_total
    FROM mystery_box_product_rel
    GROUP BY mystery_box_id
) agg ON agg.mystery_box_id = mb.id
SET mb.pool_remaining = GREATEST(agg.sum_remaining, 50),
    mb.pool_total = GREATEST(agg.sum_total, mb.pool_total, 50);

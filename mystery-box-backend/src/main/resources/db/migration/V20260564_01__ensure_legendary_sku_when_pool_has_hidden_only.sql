-- 仅有 HIDDEN、无 LEGENDARY 的奖池：legendary_rate 命中后只能降级，补一个 LEGENDARY SKU

UPDATE product p
INNER JOIN (
    SELECT
        rel.product_id,
        rel.mystery_box_id,
        ROW_NUMBER() OVER (PARTITION BY rel.mystery_box_id ORDER BY rel.sort_order, rel.id) AS rn
    FROM mystery_box_product_rel rel
) ranked ON p.id = ranked.product_id
INNER JOIN (
    SELECT rel.mystery_box_id
    FROM mystery_box_product_rel rel
    INNER JOIN product pr ON pr.id = rel.product_id
    GROUP BY rel.mystery_box_id
    HAVING SUM(CASE WHEN pr.quality_type = 'LEGENDARY' THEN 1 ELSE 0 END) = 0
       AND SUM(CASE WHEN pr.quality_type = 'HIDDEN' THEN 1 ELSE 0 END) > 0
) need ON need.mystery_box_id = ranked.mystery_box_id
SET p.quality_type = 'LEGENDARY'
WHERE ranked.rn = 1
  AND p.quality_type = 'GENERAL';

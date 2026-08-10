-- Dev-friendly CNY-scale catalog prices (avoid VND-scale values like 199000 in CN locale tests)

UPDATE mystery_box
SET price = CASE
    WHEN price >= 100000 THEN 29.90
    WHEN price >= 50000 THEN 19.90
    WHEN price >= 10000 THEN 9.90
    WHEN price >= 1000 THEN 4.90
    WHEN price > 100 THEN 59.90
    ELSE price
END,
edited_time = CURRENT_TIMESTAMP(6)
WHERE price > 100;

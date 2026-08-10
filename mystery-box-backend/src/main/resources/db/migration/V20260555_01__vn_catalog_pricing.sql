-- Convert legacy CNY-scale mystery_box prices (< 1000) to VND sample values

UPDATE mystery_box
SET price = CASE
    WHEN price <= 20 THEN 199000
    WHEN price <= 50 THEN 499000
    WHEN price <= 100 THEN 999000
    WHEN price <= 200 THEN 1499000
    ELSE ROUND(price * 10000, 0)
END,
edited_time = CURRENT_TIMESTAMP(6)
WHERE price < 1000;

-- Ensure at least one newcomer-exclusive box exists for the offer modal.
SET @has_newcomer := (
    SELECT COUNT(*) FROM mystery_box WHERE newcomer_exclusive = 1
);

SET @pick_id := (
    SELECT id FROM (
        SELECT id FROM mystery_box ORDER BY price ASC, created_time ASC LIMIT 1
    ) AS cheapest
);

UPDATE mystery_box
SET newcomer_exclusive = 1
WHERE id = @pick_id
  AND @pick_id IS NOT NULL
  AND @has_newcomer = 0;

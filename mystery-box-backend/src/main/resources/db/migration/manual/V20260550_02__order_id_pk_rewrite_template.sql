-- Step 2 manual PK rewrite (run only after prepare-mappings API populated order_id_legacy_map).
-- BACKUP DATABASE FIRST. Review in staging. Adjust FK table list for your schema.

-- Example for one legacy row (repeat in batch job or stored procedure):
-- SET @legacy := 'a1b2c3d4e5f6789012345678901234ab';
-- SET @current := (SELECT current_id FROM order_id_legacy_map WHERE legacy_id = @legacy);
--
-- UPDATE payment SET id = @current WHERE id = @legacy;
-- UPDATE base_order SET id = @current WHERE id = @legacy;
-- UPDATE mystery_box_order SET id = @current WHERE id = @legacy;
-- UPDATE marketplace_listing SET mystery_box_order_id = @current WHERE mystery_box_order_id = @legacy;
-- UPDATE warehouse_ship_request_item SET order_id = @current WHERE order_id = @legacy;
-- UPDATE user_notification SET ref_id = @current WHERE ref_id = @legacy AND category IN ('ORDER','PENDING_PAY','REFUND');
-- UPDATE mystery_box_draw_log SET mystery_box_order_id = @current WHERE mystery_box_order_id = @legacy;
-- UPDATE refund_record SET order_id = @current WHERE order_id = @legacy;

-- Verify counts before/after:
-- SELECT COUNT(*) FROM mystery_box_order WHERE id NOT REGEXP '^[0-9]{10,20}$';

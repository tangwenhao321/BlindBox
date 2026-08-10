INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-payment-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '支付记录', '/payment', '7e6a08be19d340a68981f1be6a14ec92', 11, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/payment');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-payment-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/payment' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/payment' LIMIT 1)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-address-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '收货地址', '/address', '7e6a08be19d340a68981f1be6a14ec92', 12, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/address');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-address-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/address' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/address' LIMIT 1)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-coupon-box-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '优惠券盲盒关联', '/coupon-box-rel', 'c9cf9ed3f15d4e20b37c672500311324', 5, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/coupon-box-rel');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-coupon-box-rel-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/coupon-box-rel' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/coupon-box-rel' LIMIT 1)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-coupon-box-rel-dtl-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '优惠券盲盒关联详情', '/coupon-box-rel-details', 'c9cf9ed3f15d4e20b37c672500311324', 6, 'PAGE', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/coupon-box-rel-details');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-coupon-box-rel-dtl-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/coupon-box-rel-details' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/coupon-box-rel-details' LIMIT 1)
);

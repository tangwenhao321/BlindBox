INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-warehouse-ship-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '仓库发货', '/warehouse-ship-request', '7e6a08be19d340a68981f1be6a14ec92', 9, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/warehouse-ship-request');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-warehouse-ship-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/warehouse-ship-request' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/warehouse-ship-request' LIMIT 1)
);

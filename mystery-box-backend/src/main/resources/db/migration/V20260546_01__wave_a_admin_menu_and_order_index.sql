INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-search-hot-kw-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '搜索热词', '/search-hot-keywords', '7e6a08be19d340a68981f1be6a14ec92', 8, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/search-hot-keywords');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-search-hot-kw-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/search-hot-keywords' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/search-hot-keywords' LIMIT 1)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-hint-policy-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '提示卡策略', '/hint-policy', '7e6a08be19d340a68981f1be6a14ec92', 9, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/hint-policy');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-hint-policy-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/hint-policy' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/hint-policy' LIMIT 1)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-newcomer-tpl-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '新人任务模板', '/newcomer-missions-template', '7e6a08be19d340a68981f1be6a14ec92', 10, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/newcomer-missions-template');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-newcomer-tpl-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc',
       (SELECT id FROM menu WHERE path = '/newcomer-missions-template' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM role_menu_rel
  WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc'
    AND menu_id = (SELECT id FROM menu WHERE path = '/newcomer-missions-template' LIMIT 1)
);

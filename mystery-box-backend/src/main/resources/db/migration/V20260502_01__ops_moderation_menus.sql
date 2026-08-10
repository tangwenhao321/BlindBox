-- Admin menus for ops platform and moderation workbench (idempotent seeds)
INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-ops-dir-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '运营管理', '/ops-root', NULL, 90, 'DIRECTORY', 'Monitor', 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE id = 'mb-ops-dir-001');

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-ops-page-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '运营中台', '/ops-platform', 'mb-ops-dir-001', 1, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE id = 'mb-ops-page-001');

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-mod-page-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '内容审核', '/moderation-workbench', 'mb-ops-dir-001', 2, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE id = 'mb-mod-page-001');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-ops-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-ops-dir-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-ops-rel-001');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-ops-rel-002', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-ops-page-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-ops-rel-002');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-ops-rel-003', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7', '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-mod-page-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-ops-rel-003');

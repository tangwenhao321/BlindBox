-- VN market feature toggles + admin menu for Feature Flag management
INSERT INTO ops_feature_flag(flag_key, enabled, description)
VALUES
    ('mobile.community.enabled', 1, 'Community feed and posts'),
    ('mobile.marketplace.enabled', 1, 'Secondary marketplace'),
    ('mobile.welfare.enabled', 1, 'Welfare center and check-in'),
    ('mobile.referral.milestones', 1, 'Referral milestone UI')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-feature-flag-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       'Feature Flag', '/feature-flag', 'mb-ops-dir-001', 5, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/feature-flag');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-feature-flag-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-feature-flag-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-feature-flag-rel-001');

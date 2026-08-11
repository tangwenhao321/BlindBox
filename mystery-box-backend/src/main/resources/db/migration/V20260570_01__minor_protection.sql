-- Minor protection: real-name verification, derived age tier, and an audit trail.
--
-- Before this, `user_compliance` held only a self-attested `age_confirmed_at`, which any minor can
-- tick. Verified identity gives an age we can actually apply spend caps and audio limits to.
--
-- Raw ID numbers are never stored: only a keyed hash (for duplicate detection) and a masked form
-- (for support to confirm which document a user submitted).

SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'real_name') = 0,
    'ALTER TABLE user_compliance ADD COLUMN real_name VARCHAR(64) NULL COMMENT ''name as printed on the document''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'id_number_hash') = 0,
    'ALTER TABLE user_compliance ADD COLUMN id_number_hash CHAR(64) NULL COMMENT ''hmac-sha256 of the id number; never the raw value''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'id_number_masked') = 0,
    'ALTER TABLE user_compliance ADD COLUMN id_number_masked VARCHAR(32) NULL COMMENT ''first/last digits only, for support''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'id_region') = 0,
    'ALTER TABLE user_compliance ADD COLUMN id_region VARCHAR(8) NULL COMMENT ''VN (CCCD) or CN (resident id)''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'birth_date') = 0,
    'ALTER TABLE user_compliance ADD COLUMN birth_date DATE NULL COMMENT ''verified date of birth''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'age_tier') = 0,
    'ALTER TABLE user_compliance ADD COLUMN age_tier VARCHAR(16) NULL COMMENT ''CHILD/YOUNG_TEEN/TEEN/ADULT at verification time''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'verified_at') = 0,
    'ALTER TABLE user_compliance ADD COLUMN verified_at DATETIME(6) NULL COMMENT ''when identity verification succeeded''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND COLUMN_NAME = 'guardian_contact') = 0,
    'ALTER TABLE user_compliance ADD COLUMN guardian_contact VARCHAR(64) NULL COMMENT ''guardian phone for minors''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- One document per account: a minor must not be able to re-verify under a second account to reset caps.
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'user_compliance' AND INDEX_NAME = 'uk_user_compliance_id_hash') = 0,
    'ALTER TABLE user_compliance ADD UNIQUE KEY uk_user_compliance_id_hash (id_number_hash)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Attempt log. Holds no document data, so it is safe to keep for as long as auditors need.
CREATE TABLE IF NOT EXISTS user_identity_verify_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    id_region VARCHAR(8) NULL,
    outcome VARCHAR(24) NOT NULL COMMENT 'PASSED / REJECTED',
    reason VARCHAR(255) NULL,
    age_tier VARCHAR(16) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_identity_verify_user (user_id, created_time),
    KEY idx_identity_verify_outcome (outcome, created_time)
);

-- Admin page for reviewing verification outcomes.
INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-minor-protect-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '未成年保护', '/minor-protection', 'mb-ops-dir-001', 7, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/minor-protection');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-minor-protect-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-minor-protect-001'
WHERE NOT EXISTS (
    SELECT 1 FROM role_menu_rel WHERE role_id = '5f785900-d317-4210-979d-d17a40ba8ecc' AND menu_id = 'mb-minor-protect-001'
);

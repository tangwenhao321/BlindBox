-- App binary release records so mobile version publishing/auto-push is data driven
-- instead of depending on APP_ANDROID_* environment variables per deployment.
CREATE TABLE IF NOT EXISTS app_version_release (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    platform VARCHAR(16) NOT NULL DEFAULT 'android',
    channel VARCHAR(64) NOT NULL DEFAULT 'production',
    version_code INT NOT NULL,
    version_name VARCHAR(64) NOT NULL DEFAULT '',
    download_url VARCHAR(512) NOT NULL DEFAULT '',
    force_update TINYINT(1) NOT NULL DEFAULT 0,
    min_supported_version_code INT NOT NULL DEFAULT 0,
    release_notes TEXT,
    push_title VARCHAR(128) NOT NULL DEFAULT '',
    push_body VARCHAR(512) NOT NULL DEFAULT '',
    auto_push TINYINT(1) NOT NULL DEFAULT 1,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    published_time TIMESTAMP NULL DEFAULT NULL,
    last_pushed_time TIMESTAMP NULL DEFAULT NULL,
    push_sent_count INT NOT NULL DEFAULT 0,
    operator VARCHAR(64) NOT NULL DEFAULT '',
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_app_version_release (platform, channel, version_code),
    KEY idx_app_version_release_lookup (platform, channel, status, version_code)
);

CREATE TABLE IF NOT EXISTS app_version_push_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    release_id VARCHAR(32) NOT NULL,
    trigger_source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    operator VARCHAR(64) NOT NULL DEFAULT '',
    target_count INT NOT NULL DEFAULT 0,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_app_version_push_log_release (release_id)
);

INSERT INTO menu (id, created_time, edited_time, creator_id, editor_id, name, path, parent_id, order_num, menu_type, icon, visible)
SELECT 'mb-app-version-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '版本发布', '/app-version', 'mb-ops-dir-001', 6, 'PAGE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE path = '/app-version');

INSERT INTO role_menu_rel (id, created_time, edited_time, creator_id, editor_id, role_id, menu_id)
SELECT 'mb-app-version-rel-001', NOW(6), NOW(6), '0f07d638f1bc401188d86dc650ab06a7', '0f07d638f1bc401188d86dc650ab06a7',
       '5f785900-d317-4210-979d-d17a40ba8ecc', 'mb-app-version-001'
WHERE NOT EXISTS (SELECT 1 FROM role_menu_rel WHERE id = 'mb-app-version-rel-001');

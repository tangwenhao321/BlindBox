CREATE TABLE IF NOT EXISTS ops_app_config_version (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    version_no INT NOT NULL,
    template_id VARCHAR(64) DEFAULT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(64) DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ops_app_config_version_no (version_no)
);

CREATE TABLE IF NOT EXISTS ops_app_config_audit_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    version_id VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    operator VARCHAR(64) DEFAULT '',
    diff_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ops_app_config_audit_version (version_id)
);

CREATE TABLE IF NOT EXISTS ops_app_config_rollout (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    version_id VARCHAR(32) NOT NULL,
    bucket_type VARCHAR(32) NOT NULL,
    bucket_key VARCHAR(128) NOT NULL DEFAULT '',
    percentage INT NOT NULL DEFAULT 100,
    priority INT NOT NULL DEFAULT 0,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    KEY idx_ops_app_config_rollout_version (version_id),
    KEY idx_ops_app_config_rollout_bucket (bucket_type, bucket_key)
);

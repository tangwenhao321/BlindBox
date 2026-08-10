CREATE TABLE IF NOT EXISTS ops_feature_flag (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    flag_key VARCHAR(128) NOT NULL UNIQUE,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    description VARCHAR(255) DEFAULT '',
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_post (
    id VARCHAR(32) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS community_comment (
    id VARCHAR(32) PRIMARY KEY,
    post_id VARCHAR(32) NOT NULL,
    author_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL,
    INDEX idx_community_comment_post_id(post_id)
);

CREATE TABLE IF NOT EXISTS community_like (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    created_time DATETIME NOT NULL,
    UNIQUE KEY uk_community_like_post_user(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_follow (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64) NOT NULL,
    created_time DATETIME NOT NULL,
    UNIQUE KEY uk_community_follow_user_target(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS community_notification (
    id VARCHAR(32) PRIMARY KEY,
    receiver_id VARCHAR(64) NOT NULL,
    content VARCHAR(255) NOT NULL,
    read_status TINYINT(1) NOT NULL DEFAULT 0,
    created_time DATETIME NOT NULL,
    INDEX idx_community_notification_receiver(receiver_id)
);

CREATE TABLE IF NOT EXISTS community_report (
    id VARCHAR(32) PRIMARY KEY,
    reporter_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    remark VARCHAR(255) DEFAULT '',
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL,
    INDEX idx_community_report_status(status)
);

CREATE TABLE IF NOT EXISTS ops_campaign (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_segment (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    rule_json TEXT NOT NULL,
    created_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_message_task (
    id VARCHAR(32) PRIMARY KEY,
    template_name VARCHAR(128) NOT NULL,
    segment_id VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS ops_ticket (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_time DATETIME NOT NULL,
    edited_time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_event (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64) DEFAULT '',
    payload_json TEXT NOT NULL,
    event_at DATETIME NOT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_event_name(event_name),
    INDEX idx_analytics_event_at(event_at)
);

CREATE TABLE IF NOT EXISTS audit_trail (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    action_key VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64) DEFAULT '',
    object_type VARCHAR(64) DEFAULT '',
    object_id VARCHAR(64) DEFAULT '',
    trace_id VARCHAR(128) DEFAULT '',
    payload_json TEXT NOT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_trail_action(action_key),
    INDEX idx_audit_trail_created(created_time)
);

INSERT INTO ops_feature_flag(flag_key, enabled, description)
VALUES
    ('mobile.home.enhanced', 1, 'Enhanced home feed and conversion module'),
    ('mobile.detail.rarity-ui', 1, 'Rarity UI and conversion panel on detail'),
    ('mobile.analytics.upload', 1, 'Client analytics upload to backend'),
    ('admin.ops.analytics.dashboard', 1, 'Ops analytics funnel/trend dashboard'),
    ('backend.community.persistence', 1, 'Enable DB-backed community domain')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

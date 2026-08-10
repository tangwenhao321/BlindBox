INSERT INTO hint_policy_config (id, config_key, config_value, description, created_time, updated_time)
VALUES
    ('hint-max-per-session', 'hint_max_per_session', 3, 'Max hints per box session', NOW(), NOW()),
    ('hint-default-grant', 'hint_default_grant', 1, 'Default hint cards granted to new users', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_time = NOW();

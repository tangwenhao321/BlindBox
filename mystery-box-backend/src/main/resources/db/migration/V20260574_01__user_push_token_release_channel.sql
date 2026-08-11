ALTER TABLE user_push_token
  ADD COLUMN release_channel VARCHAR(64) NULL DEFAULT NULL AFTER platform;
UPDATE user_push_token SET release_channel = 'production' WHERE release_channel IS NULL;
CREATE INDEX idx_user_push_platform_channel ON user_push_token (platform, release_channel);

-- A user may sign in on several devices. The old UNIQUE(user_id) forced one row per user, so
-- registering a second device silently replaced the first and that device stopped receiving push.
-- Uniqueness belongs on the token (it identifies a device installation), not on the user.

-- Collapse any duplicate tokens first so the new unique index can be created.
DELETE t1 FROM user_push_token t1
INNER JOIN user_push_token t2
    ON t1.expo_push_token = t2.expo_push_token
   AND (t1.updated_time < t2.updated_time
        OR (t1.updated_time = t2.updated_time AND t1.id > t2.id));

ALTER TABLE user_push_token DROP INDEX uk_user_push_user;

ALTER TABLE user_push_token ADD UNIQUE KEY uk_user_push_token (expo_push_token);

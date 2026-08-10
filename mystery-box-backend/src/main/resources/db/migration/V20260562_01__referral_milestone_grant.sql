CREATE TABLE IF NOT EXISTS referral_milestone_grant (
    id            VARCHAR(32)  NOT NULL PRIMARY KEY,
    user_id       VARCHAR(32)  NOT NULL,
    target_count  INT          NOT NULL,
    reward_coins  INT          NOT NULL,
    created_time  DATETIME     NOT NULL,
    UNIQUE KEY uk_referral_milestone_user_target (user_id, target_count)
) COMMENT = '邀请里程碑幸运币发放记录';

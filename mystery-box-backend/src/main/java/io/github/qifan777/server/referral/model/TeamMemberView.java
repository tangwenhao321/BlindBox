package io.github.qifan777.server.referral.model;

import java.time.LocalDateTime;

public record TeamMemberView(
        String userId,
        String nickname,
        String phone,
        LocalDateTime joinedAt
) {
}

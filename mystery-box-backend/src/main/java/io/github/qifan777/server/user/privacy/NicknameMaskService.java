package io.github.qifan777.server.user.privacy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NicknameMaskService {
    @Value("${app.privacy.mask-nickname-suffix:4}")
    private int maskNicknameSuffix;

    public String displayName(String userId, String nickname) {
        if (nickname != null && !nickname.isBlank()) {
            return nickname;
        }
        return maskUserId(userId, "用户");
    }

    public String maskUserId(String userId, String prefix) {
        if (userId == null || userId.isBlank()) {
            return prefix + "*";
        }
        int suffix = Math.max(2, Math.min(maskNicknameSuffix, userId.length()));
        return prefix + userId.substring(userId.length() - suffix);
    }
}

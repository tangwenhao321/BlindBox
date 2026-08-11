package io.github.qifan777.server.infrastructure.security;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.springframework.util.StringUtils;

/**
 * Front-API ownership guard: caller may only access their own rows.
 */
public final class FrontOwnership {
    private FrontOwnership() {
    }

    public static void assertSelf(String userId) {
        if (!StringUtils.hasText(userId) || !userId.equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("无权访问该数据"));
        }
    }
}

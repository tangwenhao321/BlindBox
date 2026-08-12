package io.github.qifan777.server.infrastructure.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * App Store Guideline 3.1.1 — block digital wallet / fragment loops for iOS App Store clients.
 * Clients send {@code X-Client-Platform: ios}.
 */
@Component
public class IosDigitalGoodsGuard {

    public static final String HEADER = "X-Client-Platform";

    public void rejectIfIosAppStoreClient() {
        String platform = resolveClientPlatform();
        if (platform != null && platform.equalsIgnoreCase("ios")) {
            throw new BusinessException("IOS_DIGITAL_GOODS_BLOCKED");
        }
    }

    private String resolveClientPlatform() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        if (request == null) {
            return null;
        }
        String header = request.getHeader(HEADER);
        return header == null ? null : header.trim();
    }
}

package io.github.qifan777.server.infrastructure.config;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.user.compliance.MinorProtectionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Dual-layer guard on create-order: service layer already asserts, this catches any path that
 * reaches the create endpoint without going through MysteryBoxOrderService.create.
 */
@Component
@RequiredArgsConstructor
public class MinorPurchaseInterceptor implements HandlerInterceptor {
    private final MinorProtectionService minorProtectionService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        if (uri == null || !uri.contains("/front/mystery-box-order/create")) {
            return true;
        }
        if (!StpUtil.isLogin()) {
            return true;
        }
        minorProtectionService.assertPurchaseAllowed(StpUtil.getLoginIdAsString());
        return true;
    }
}

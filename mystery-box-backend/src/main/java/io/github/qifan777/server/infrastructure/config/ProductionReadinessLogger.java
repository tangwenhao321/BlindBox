package io.github.qifan777.server.infrastructure.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Logs production readiness hints on startup (no hard failure in dev).
 */
@Component
@Slf4j
public class ProductionReadinessLogger {
    @Value("${payment.mock-enabled:false}")
    private boolean paymentMockEnabled;
    @Value("${oss.provider:}")
    private String ossProvider;
    @Value("${wx.pay.mch-id:}")
    private String wxMchId;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (paymentMockEnabled) {
            log.info("Payment: mock mode enabled (payment.mock-enabled=true)");
        } else if (isPlaceholder(wxMchId)) {
            log.warn("Payment: mock disabled but wx.pay.mch-id looks unset — configure WeChat pay before production");
        }
        if ("local".equalsIgnoreCase(ossProvider)) {
            log.info("OSS: local disk storage (oss.provider=local) — use ali_yun + CDN in production");
        } else if (ossProvider == null || ossProvider.isBlank()) {
            log.warn("OSS: oss.provider not set — uploads may fail until local or Aliyun is configured");
        }
        log.info("Production checklist: payment.mock-enabled={}, flyway migrations on boot, Expo push tokens for mobile");
    }

    private static boolean isPlaceholder(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        return value.contains("xxxx") || value.startsWith("local-") || "CHANGE_ME".equalsIgnoreCase(value);
    }
}

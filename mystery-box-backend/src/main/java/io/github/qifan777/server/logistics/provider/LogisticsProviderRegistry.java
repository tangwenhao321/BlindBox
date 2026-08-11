package io.github.qifan777.server.logistics.provider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Resolves {@code app.logistics.provider}. VN carriers without tokens fall back to local.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LogisticsProviderRegistry {
    private final LocalLogisticsProvider localLogisticsProvider;
    private final VnCarrierLogisticsProvider vnCarrierLogisticsProvider;

    @Value("${app.logistics.provider:local}")
    private String configuredProvider;

    public LogisticsProvider resolve() {
        String normalized = configuredProvider == null ? "local" : configuredProvider.trim().toLowerCase(Locale.ROOT);
        if ("local".equals(normalized) || normalized.isBlank()) {
            return localLogisticsProvider;
        }
        if (vnCarrierLogisticsProvider.matchesConfiguredProvider()) {
            if (vnCarrierLogisticsProvider.isReady()) {
                return vnCarrierLogisticsProvider;
            }
            log.warn(
                    "app.logistics.provider={} is not ready ({}); falling back to local",
                    normalized,
                    vnCarrierLogisticsProvider.notReadyReason()
            );
            return localLogisticsProvider;
        }
        log.warn("Unknown app.logistics.provider={}; falling back to local", normalized);
        return localLogisticsProvider;
    }
}

package io.github.qifan777.server.logistics.provider;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Vietnam carrier stub (GHN / GHTK / Viettel Post).
 * Without Partner tracking HTTP {@link #isReady()} is false and the registry falls back to local.
 */
@Component
@Slf4j
public class VnCarrierLogisticsProvider implements LogisticsProvider {
    private static final Set<String> VN_CARRIERS = Set.of("ghn", "ghtk", "viettel");

    @Value("${app.logistics.provider:local}")
    private String configuredProvider;

    @SuppressWarnings("unused")
    @Value("${app.logistics.ghn.token:}")
    private String ghnToken;

    @SuppressWarnings("unused")
    @Value("${app.logistics.ghtk.token:}")
    private String ghtkToken;

    @SuppressWarnings("unused")
    @Value("${app.logistics.viettel.token:}")
    private String viettelToken;

    @SuppressWarnings("unused")
    @Value("${app.logistics.partner-wired:false}")
    private boolean partnerWired;

    @Override
    public String provider() {
        String normalized = normalize(configuredProvider);
        return VN_CARRIERS.contains(normalized) ? normalized : "ghn";
    }

    /** Whether the configured app.logistics.provider is a VN carrier this bean serves. */
    public boolean matchesConfiguredProvider() {
        return VN_CARRIERS.contains(normalize(configuredProvider));
    }

    @Override
    public boolean isReady() {
        // partner-wired + token alone are insufficient — tracking HTTP is not implemented.
        // ProductionSafetyValidator refuses partner-wired=true until this returns true with real API.
        return false;
    }

    @Override
    public List<RemoteTrackingEvent> fetchTracking(String trackingNumber, String carrierCode) {
        String carrier = provider();
        log.info(
                "VN logistics provider={} not ready (Partner tracking HTTP not wired); placeholder only tracking={}",
                carrier,
                trackingNumber
        );
        return List.of(new RemoteTrackingEvent(
                "PENDING_EXTERNAL",
                "Tracking via " + carrier.toUpperCase(Locale.ROOT) + " not configured yet",
                LocalDateTime.now(),
                carrier.toUpperCase(Locale.ROOT)
        ));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}

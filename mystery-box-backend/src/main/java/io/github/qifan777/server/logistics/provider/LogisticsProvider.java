package io.github.qifan777.server.logistics.provider;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Carrier tracking SPI. Config key: {@code app.logistics.provider}
 * ({@code local} | {@code ghn} | {@code ghtk} | {@code viettel}).
 */
public interface LogisticsProvider {

    /** Config / registry key for this implementation. */
    String provider();

    /**
     * Whether this provider has credentials and may be used for live tracking.
     * When false, {@link LogisticsProviderRegistry} falls back to local.
     */
    default boolean isReady() {
        return true;
    }

    default String notReadyReason() {
        return "LOGISTICS_PROVIDER_NOT_READY: " + provider() + " credentials missing";
    }

    /**
     * Fetch live tracking events from the carrier API.
     * Empty when unavailable; callers keep local timeline events.
     */
    List<RemoteTrackingEvent> fetchTracking(String trackingNumber, String carrierCode);

    record RemoteTrackingEvent(String status, String description, LocalDateTime eventTime, String source) {
    }
}

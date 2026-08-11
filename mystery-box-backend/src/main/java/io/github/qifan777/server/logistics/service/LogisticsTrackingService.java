package io.github.qifan777.server.logistics.service;

import io.github.qifan777.server.logistics.provider.LogisticsProvider;
import io.github.qifan777.server.logistics.provider.LogisticsProviderRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Local logistics events plus optional live carrier poll via {@link LogisticsProvider}.
 */
@Service
@RequiredArgsConstructor
public class LogisticsTrackingService {
    private final OrderLogisticsService orderLogisticsService;
    private final JdbcTemplate jdbcTemplate;
    private final LogisticsProviderRegistry logisticsProviderRegistry;

    public TrackingResult trackOrder(String userId, String orderId) {
        verifyOrderOwner(userId, orderId);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT tracking_number, carrier_code FROM base_order WHERE id = ?",
                orderId
        );
        if (rows.isEmpty()) {
            return new TrackingResult(orderId, null, null, List.of(), "NOT_FOUND", false);
        }
        String tracking = (String) rows.get(0).get("tracking_number");
        String carrier = (String) rows.get(0).get("carrier_code");
        return buildResult(orderId, tracking, carrier == null ? "auto" : carrier);
    }

    public TrackingResult trackByNumber(String trackingNumber, String carrierCode) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            return new TrackingResult(null, trackingNumber, carrierCode, List.of(), "NO_TRACKING", false);
        }
        return buildResult(null, trackingNumber.trim(), carrierCode == null ? "auto" : carrierCode);
    }

    public TrackingResult trackWarehouseShipRequest(String userId, String requestId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                        SELECT tracking_number, carrier_code FROM warehouse_ship_request
                        WHERE id = ? AND user_id = ?
                        """,
                requestId,
                userId
        );
        if (rows.isEmpty()) {
            return new TrackingResult(requestId, null, null, List.of(), "NOT_FOUND", false);
        }
        String tracking = (String) rows.get(0).get("tracking_number");
        String carrier = (String) rows.get(0).get("carrier_code");
        return buildResult(requestId, tracking, carrier);
    }

    private TrackingResult buildResult(String refId, String trackingNumber, String carrierCode) {
        List<OrderLogisticsService.LogisticsEventView> local = refId == null
                ? List.of()
                : orderLogisticsService.list(refId);
        List<TrackingEvent> events = new ArrayList<>();
        for (var e : local) {
            events.add(new TrackingEvent(e.status(), e.description(), e.eventTime(), "LOCAL"));
        }
        boolean live = false;
        String state = trackingNumber == null || trackingNumber.isBlank() ? "NO_TRACKING" : "LOCAL_ONLY";
        LogisticsProvider provider = logisticsProviderRegistry.resolve();
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            try {
                List<LogisticsProvider.RemoteTrackingEvent> remote =
                        provider.fetchTracking(trackingNumber, carrierCode);
                if (!remote.isEmpty()) {
                    for (var r : remote) {
                        events.add(new TrackingEvent(r.status(), r.description(), r.eventTime(), r.source()));
                    }
                    live = !"local".equalsIgnoreCase(provider.provider());
                    state = remote.get(remote.size() - 1).status();
                    // Kuaidi100 (local provider) still counts as live when it returned rows
                    if ("local".equalsIgnoreCase(provider.provider())
                            && remote.stream().anyMatch(e -> "KUAIDI100".equalsIgnoreCase(e.source()))) {
                        live = true;
                    }
                }
            } catch (Exception ignored) {
                // keep local events only
            }
        }
        return new TrackingResult(refId, trackingNumber, carrierCode, events, state, live);
    }

    private void verifyOrderOwner(String userId, String orderId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM base_order WHERE id = ? AND creator_id = ?",
                Integer.class,
                orderId,
                userId
        );
        if (count == null || count == 0) {
            throw new io.qifan.infrastructure.common.exception.BusinessException("无权查看该订单物流");
        }
    }

    public record TrackingEvent(String status, String description, java.time.LocalDateTime eventTime, String source) {
    }

    public record TrackingResult(
            String refId,
            String trackingNumber,
            String carrierCode,
            List<TrackingEvent> events,
            String latestStatus,
            boolean liveProvider
    ) {
    }
}

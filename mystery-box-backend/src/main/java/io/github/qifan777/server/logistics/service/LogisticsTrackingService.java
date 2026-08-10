package io.github.qifan777.server.logistics.service;

import io.github.qifan777.server.payment.config.MarketProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Local logistics events plus optional Kuaidi100 poll API (configure key in application-private.yml).
 */
@Service
@RequiredArgsConstructor
public class LogisticsTrackingService {
    private final OrderLogisticsService orderLogisticsService;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${logistics.kuaidi100.customer:}")
    private String kuaidiCustomer;

    @Value("${logistics.kuaidi100.key:}")
    private String kuaidiKey;

    @Value("${logistics.kuaidi100.enabled:false}")
    private boolean kuaidiEnabled;

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
        boolean localOnlyLogistics = "local-only".equalsIgnoreCase(marketProperties.getLogisticsMode());
        if (!localOnlyLogistics && kuaidiEnabled && trackingNumber != null && !trackingNumber.isBlank()
                && kuaidiCustomer != null && !kuaidiCustomer.isBlank()
                && kuaidiKey != null && !kuaidiKey.isBlank()) {
            try {
                List<TrackingEvent> remote = pollKuaidi100(trackingNumber, carrierCode);
                if (!remote.isEmpty()) {
                    events.addAll(remote);
                    live = true;
                    state = remote.get(remote.size() - 1).status();
                }
            } catch (Exception ignored) {
                // keep local events only
            }
        }
        return new TrackingResult(refId, trackingNumber, carrierCode, events, state, live);
    }

    @SuppressWarnings("unchecked")
    private List<TrackingEvent> pollKuaidi100(String trackingNumber, String carrierCode) {
        String com = carrierCode == null || "auto".equalsIgnoreCase(carrierCode) ? "yuantong" : carrierCode;
        String param = "{\"com\":\"" + com + "\",\"num\":\"" + trackingNumber + "\"}";
        String sign = md5Hex(param + kuaidiKey + kuaidiCustomer).toUpperCase();
        String body = "customer=" + kuaidiCustomer + "&sign=" + sign + "&param=" + param;
        Map<String, Object> resp = restTemplate.postForObject(
                "https://poll.kuaidi100.com/poll/query.do",
                body,
                Map.class
        );
        if (resp == null || !"200".equals(String.valueOf(resp.get("status")))) {
            return List.of();
        }
        Object dataObj = resp.get("data");
        if (!(dataObj instanceof List<?> data)) {
            return List.of();
        }
        List<TrackingEvent> events = new ArrayList<>();
        for (Object row : data) {
            if (row instanceof Map<?, ?> map) {
                events.add(new TrackingEvent(
                        String.valueOf(map.get("status")),
                        String.valueOf(map.get("context")),
                        LocalDateTime.now(),
                        "KUAIDI100"
                ));
            }
        }
        return events;
    }

    private static String md5Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("MD5");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("MD5 unavailable", e);
        }
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

    public record TrackingEvent(String status, String description, LocalDateTime eventTime, String source) {
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

package io.github.qifan777.server.logistics.provider;

import io.github.qifan777.server.payment.config.MarketProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * Default logistics provider: optional Kuaidi100 poll when market logistics-mode is full.
 * Local timeline events remain owned by {@code OrderLogisticsService}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LocalLogisticsProvider implements LogisticsProvider {
    private final MarketProperties marketProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${logistics.kuaidi100.customer:}")
    private String kuaidiCustomer;

    @Value("${logistics.kuaidi100.key:}")
    private String kuaidiKey;

    @Value("${logistics.kuaidi100.enabled:false}")
    private boolean kuaidiEnabled;

    @Override
    public String provider() {
        return "local";
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<RemoteTrackingEvent> fetchTracking(String trackingNumber, String carrierCode) {
        if (!StringUtils.hasText(trackingNumber)) {
            return List.of();
        }
        boolean localOnlyLogistics = "local-only".equalsIgnoreCase(marketProperties.getLogisticsMode());
        if (localOnlyLogistics || !kuaidiEnabled
                || !StringUtils.hasText(kuaidiCustomer)
                || !StringUtils.hasText(kuaidiKey)) {
            return List.of();
        }
        try {
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
            List<RemoteTrackingEvent> events = new ArrayList<>();
            for (Object row : data) {
                if (row instanceof Map<?, ?> map) {
                    events.add(new RemoteTrackingEvent(
                            String.valueOf(map.get("status")),
                            String.valueOf(map.get("context")),
                            LocalDateTime.now(),
                            "KUAIDI100"
                    ));
                }
            }
            return events;
        } catch (Exception ex) {
            log.debug("Kuaidi100 poll failed for tracking={}", trackingNumber, ex);
            return List.of();
        }
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
}

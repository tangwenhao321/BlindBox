package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.root.controller.MysteryBoxLowStockForAdminController;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LowStockWebhookNotifier {
    private final JdbcTemplate jdbcTemplate;
    private final JobRunAuditService jobRunAuditService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ops.low-stock.webhook-url:}")
    private String webhookUrl;

    @Value("${ops.low-stock.threshold:5}")
    private int threshold;

    @Scheduled(cron = "0 0/30 * * * ?")
    @SchedulerLock(name = "LowStockWebhookNotifier", lockAtLeastFor = "PT2M", lockAtMostFor = "PT20M")
    public void notifyIfLowStock() {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        jobRunAuditService.runWithAudit("LowStockWebhookNotifier", () -> {
        List<MysteryBoxLowStockForAdminController.LowStockAlertView> candidates = jdbcTemplate.query(
                """
                        SELECT mb.id AS box_id, mb.name AS box_name,
                               p.id AS product_id, p.name AS product_name,
                               r.stock_remaining, r.stock_total
                        FROM mystery_box_product_rel r
                        INNER JOIN mystery_box mb ON mb.id = r.mystery_box_id
                        INNER JOIN product p ON p.id = r.product_id
                        WHERE r.stock_remaining > 0 AND r.stock_remaining <= ?
                        ORDER BY r.stock_remaining ASC
                        LIMIT 50
                        """,
                (rs, rowNum) -> new MysteryBoxLowStockForAdminController.LowStockAlertView(
                        rs.getString("box_id"),
                        rs.getString("box_name"),
                        rs.getString("product_id"),
                        rs.getString("product_name"),
                        rs.getInt("stock_remaining"),
                        rs.getInt("stock_total")
                ),
                threshold
        );
        List<MysteryBoxLowStockForAdminController.LowStockAlertView> alerts = new ArrayList<>();
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        for (var alert : candidates) {
            Integer recent = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1) FROM ops_low_stock_alert_log
                            WHERE box_id = ? AND product_id = ? AND alerted_at >= ?
                            """,
                    Integer.class,
                    alert.boxId(),
                    alert.productId(),
                    since
            );
            if (recent != null && recent > 0) {
                continue;
            }
            alerts.add(alert);
            jdbcTemplate.update(
                    """
                            INSERT INTO ops_low_stock_alert_log (box_id, product_id, alerted_at)
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE alerted_at = VALUES(alerted_at)
                            """,
                    alert.boxId(),
                    alert.productId(),
                    LocalDateTime.now()
            );
        }
        if (alerts.isEmpty()) {
            return null;
        }
        try {
            StringBuilder text = new StringBuilder("【低库存告警】共 ").append(alerts.size()).append(" 条\n");
            for (var a : alerts) {
                text.append(a.boxName()).append(" / ").append(a.productName())
                        .append(" 剩余 ").append(a.stockRemaining()).append("\n");
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = Map.of("msgtype", "text", "text", Map.of("content", text.toString()));
            restTemplate.postForEntity(webhookUrl, new HttpEntity<>(body, headers), String.class);
        } catch (Exception ex) {
            log.warn("Low stock webhook failed: {}", ex.getMessage());
        }
        return null;
        });
    }
}

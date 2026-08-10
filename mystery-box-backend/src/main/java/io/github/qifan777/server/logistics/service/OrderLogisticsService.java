package io.github.qifan777.server.logistics.service;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderLogisticsService {
    private final JdbcTemplate jdbcTemplate;

    public void recordPaid(String orderId) {
        insert(orderId, "PAID", "支付成功，等待商家发货", LocalDateTime.now());
    }

    public void recordShipped(String orderId, String trackingNumber) {
        insert(orderId, "SHIPPED", "商家已发货，物流单号 " + trackingNumber, LocalDateTime.now());
        insert(orderId, "IN_TRANSIT", "包裹运输中", LocalDateTime.now().plusMinutes(1));
    }

    public int batchShip(List<BatchShipLine> lines) {
        int ok = 0;
        for (BatchShipLine line : lines) {
            if (line.orderId() == null || line.orderId().isBlank()) {
                continue;
            }
            if (line.trackingNumber() == null || line.trackingNumber().isBlank()) {
                continue;
            }
            recordShipped(line.orderId().trim(), line.trackingNumber().trim());
            ok++;
        }
        return ok;
    }

    public record BatchShipLine(String orderId, String trackingNumber, String carrierCode) {
    }

    public void recordCreated(String orderId) {
        insert(orderId, "CREATED", "订单已创建，待支付", LocalDateTime.now());
    }

    public List<LogisticsEventView> list(String orderId) {
        return jdbcTemplate.query(
                "SELECT status, description, event_time FROM order_logistics_event WHERE order_id = ? ORDER BY event_time ASC",
                (rs, rowNum) -> new LogisticsEventView(
                        rs.getString("status"),
                        rs.getString("description"),
                        rs.getTimestamp("event_time").toLocalDateTime()
                ),
                orderId
        );
    }

    private void insert(String orderId, String status, String description, LocalDateTime eventTime) {
        jdbcTemplate.update(
                "INSERT INTO order_logistics_event (id, order_id, status, description, event_time, created_time) VALUES (?,?,?,?,?,?)",
                IdUtil.fastSimpleUUID(),
                orderId,
                status,
                description,
                eventTime,
                LocalDateTime.now()
        );
    }

    public record LogisticsEventView(String status, String description, LocalDateTime eventTime) {
    }
}

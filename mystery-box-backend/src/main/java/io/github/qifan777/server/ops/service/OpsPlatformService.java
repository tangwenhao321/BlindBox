package io.github.qifan777.server.ops.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OpsPlatformService {
    private static final int SEGMENT_USER_LIMIT = 500;

    private final AuditTrailService auditTrailService;
    private final JdbcTemplate jdbcTemplate;
    private final UserNotificationService userNotificationService;
    private final ObjectMapper objectMapper;

    public Campaign createCampaign(String actorId, String name, String traceId) {
        String id = id();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO ops_campaign(id, name, status, created_time, edited_time) VALUES (?, ?, ?, ?, ?)",
                id, name, "DRAFT", now, now
        );
        auditTrailService.record("OPS_CAMPAIGN_CREATE", actorId, "campaign", id, traceId, Map.of("name", name));
        return new Campaign(id, name, "DRAFT", now, now);
    }

    public List<Campaign> listCampaigns() {
        return jdbcTemplate.query(
                "SELECT id, name, status, created_time, edited_time FROM ops_campaign ORDER BY edited_time DESC",
                (rs, rowNum) -> new Campaign(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                )
        );
    }

    public Segment createSegment(String actorId, String name, String rule, String traceId) {
        String id = id();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO ops_segment(id, name, rule_json, created_time) VALUES (?, ?, ?, ?)",
                id, name, rule, now
        );
        auditTrailService.record("OPS_SEGMENT_CREATE", actorId, "segment", id, traceId, Map.of("rule", rule));
        return new Segment(id, name, rule, now);
    }

    public List<Segment> listSegments() {
        return jdbcTemplate.query(
                "SELECT id, name, rule_json, created_time FROM ops_segment ORDER BY created_time DESC",
                (rs, rowNum) -> new Segment(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("rule_json"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                )
        );
    }

    public MessageTask createMessageTask(String actorId, String templateName, String segmentId, String traceId) {
        String id = id();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO ops_message_task(id, template_name, segment_id, status, created_time, edited_time) VALUES (?, ?, ?, ?, ?, ?)",
                id, templateName, segmentId, "PENDING", now, now
        );
        auditTrailService.record("OPS_MESSAGE_TASK_CREATE", actorId, "messageTask", id, traceId, Map.of("segmentId", segmentId));
        return new MessageTask(id, templateName, segmentId, "PENDING", now, now);
    }

    public MessageTask runMessageTask(String actorId, String taskId, String traceId) {
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM ops_message_task WHERE id = ?", Integer.class, taskId);
        if (exists == null || exists == 0) {
            throw new BusinessException(ResultCode.NotFindError, "消息任务不存在");
        }
        jdbcTemplate.update(
                "UPDATE ops_message_task SET status = ?, edited_time = ? WHERE id = ?",
                "DONE", LocalDateTime.now(), taskId
        );
        MessageTask task = jdbcTemplate.queryForObject(
                "SELECT id, template_name, segment_id, status, created_time, edited_time FROM ops_message_task WHERE id = ?",
                (rs, rowNum) -> new MessageTask(
                        rs.getString("id"),
                        rs.getString("template_name"),
                        rs.getString("segment_id"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                ),
                taskId
        );
        int notificationsSent = dispatchMessageNotifications(task);
        auditTrailService.record(
                "OPS_MESSAGE_TASK_RUN",
                actorId,
                "messageTask",
                taskId,
                traceId,
                Map.of("status", "DONE", "notificationsSent", notificationsSent)
        );
        return task;
    }

    private int dispatchMessageNotifications(MessageTask task) {
        List<String> userIds = resolveSegmentUserIds(task.segmentId());
        String title = task.templateName() == null || task.templateName().isBlank()
                ? "运营消息"
                : task.templateName();
        String body = "您有一条新的运营通知，请查看。";
        int sent = 0;
        for (String userId : userIds) {
            userNotificationService.push(userId, "OPS_MESSAGE", title, body, task.id());
            sent++;
        }
        return sent;
    }

    private List<String> resolveSegmentUserIds(String segmentId) {
        if (segmentId == null || segmentId.isBlank()) {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM user ORDER BY created_time DESC LIMIT ?",
                    String.class,
                    SEGMENT_USER_LIMIT
            );
        }
        String ruleJson = jdbcTemplate.query(
                "SELECT rule_json FROM ops_segment WHERE id = ?",
                rs -> rs.next() ? rs.getString("rule_json") : null,
                segmentId
        );
        if (ruleJson == null || ruleJson.isBlank()) {
            return List.of();
        }
        try {
            Map<String, Object> rule = objectMapper.readValue(ruleJson, new TypeReference<>() {
            });
            if (Boolean.TRUE.equals(rule.get("vip"))) {
                return jdbcTemplate.queryForList(
                        "SELECT DISTINCT user_id FROM vip WHERE end_time > NOW() ORDER BY user_id LIMIT ?",
                        String.class,
                        SEGMENT_USER_LIMIT
                );
            }
        } catch (Exception ignored) {
            return List.of();
        }
        return jdbcTemplate.queryForList(
                "SELECT id FROM user ORDER BY created_time DESC LIMIT ?",
                String.class,
                SEGMENT_USER_LIMIT
        );
    }

    public List<MessageTask> listMessageTasks() {
        return jdbcTemplate.query(
                "SELECT id, template_name, segment_id, status, created_time, edited_time FROM ops_message_task ORDER BY edited_time DESC",
                (rs, rowNum) -> new MessageTask(
                        rs.getString("id"),
                        rs.getString("template_name"),
                        rs.getString("segment_id"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                )
        );
    }

    public Ticket createTicket(String actorId, String title, String content, String traceId) {
        String id = id();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO ops_ticket(id, user_id, title, content, status, created_time, edited_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, actorId, title, content, "OPEN", now, now
        );
        auditTrailService.record("OPS_TICKET_CREATE", actorId, "ticket", id, traceId, Map.of("title", title));
        return new Ticket(id, actorId, title, content, "OPEN", now, now);
    }

    public Ticket updateTicketStatus(String actorId, String ticketId, String nextStatus, String traceId) {
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM ops_ticket WHERE id = ?", Integer.class, ticketId);
        if (exists == null || exists == 0) {
            throw new BusinessException(ResultCode.NotFindError, "工单不存在");
        }
        jdbcTemplate.update("UPDATE ops_ticket SET status = ?, edited_time = ? WHERE id = ?", nextStatus, LocalDateTime.now(), ticketId);
        auditTrailService.record("OPS_TICKET_STATUS_UPDATE", actorId, "ticket", ticketId, traceId, Map.of("status", nextStatus));
        return jdbcTemplate.queryForObject(
                "SELECT id, user_id, title, content, status, created_time, edited_time FROM ops_ticket WHERE id = ?",
                (rs, rowNum) -> new Ticket(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("title"),
                        rs.getString("content"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                ),
                ticketId
        );
    }

    public List<Ticket> listTickets() {
        return jdbcTemplate.query(
                "SELECT id, user_id, title, content, status, created_time, edited_time FROM ops_ticket ORDER BY edited_time DESC",
                (rs, rowNum) -> new Ticket(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("title"),
                        rs.getString("content"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                )
        );
    }

    private static String id() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public record Campaign(String id, String name, String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record Segment(String id, String name, String rule, LocalDateTime createdAt) {
    }

    public record MessageTask(String id, String templateName, String segmentId, String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }

    public record Ticket(String id, String userId, String title, String content, String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }
}

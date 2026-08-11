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
    private static final int SEGMENT_PAGE_SIZE = 500;

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

    /**
     * Dry-run: count segment matches for a message task without sending notifications
     * or changing task status.
     */
    public SegmentDryRun dryRunMessageTask(String actorId, String taskId, String traceId) {
        MessageTask task = jdbcTemplate.query(
                "SELECT id, template_name, segment_id, status, created_time, edited_time FROM ops_message_task WHERE id = ?",
                rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    return new MessageTask(
                            rs.getString("id"),
                            rs.getString("template_name"),
                            rs.getString("segment_id"),
                            rs.getString("status"),
                            rs.getTimestamp("created_time").toLocalDateTime(),
                            rs.getTimestamp("edited_time").toLocalDateTime()
                    );
                },
                taskId
        );
        if (task == null) {
            throw new BusinessException(ResultCode.NotFindError, "消息任务不存在");
        }
        int matched = countSegmentUsers(task.segmentId());
        auditTrailService.record(
                "OPS_MESSAGE_TASK_DRY_RUN",
                actorId,
                "messageTask",
                taskId,
                traceId,
                Map.of("segmentId", task.segmentId() == null ? "" : task.segmentId(), "matchedUserCount", matched)
        );
        return new SegmentDryRun(taskId, task.segmentId(), matched);
    }

    /** Count users matched by a segment rule (no send). */
    public int countSegmentUsers(String segmentId) {
        int total = 0;
        int offset = 0;
        while (true) {
            List<String> page = resolveSegmentUserIds(segmentId, offset, SEGMENT_PAGE_SIZE);
            total += page.size();
            if (page.size() < SEGMENT_PAGE_SIZE) {
                break;
            }
            offset += SEGMENT_PAGE_SIZE;
        }
        return total;
    }

    private int dispatchMessageNotifications(MessageTask task) {
        String title = task.templateName() == null || task.templateName().isBlank()
                ? "运营消息"
                : task.templateName();
        String body = "您有一条新的运营通知，请查看。";
        // Paged so a campaign reaches the whole segment rather than the first page of it, and so a
        // multi-million-user segment never has to be held in memory at once.
        int sent = 0;
        int offset = 0;
        while (true) {
            List<String> page = resolveSegmentUserIds(task.segmentId(), offset, SEGMENT_PAGE_SIZE);
            if (page.isEmpty()) {
                break;
            }
            sent += userNotificationService.pushBulk(page, "OPS_MESSAGE", title, body, task.id());
            if (page.size() < SEGMENT_PAGE_SIZE) {
                break;
            }
            offset += SEGMENT_PAGE_SIZE;
        }
        return sent;
    }

    private List<String> resolveSegmentUserIds(String segmentId, int offset, int limit) {
        if (segmentId == null || segmentId.isBlank()) {
            return allUserIds(offset, limit);
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
                        "SELECT DISTINCT user_id FROM vip WHERE end_time > NOW() ORDER BY user_id LIMIT ? OFFSET ?",
                        String.class,
                        limit,
                        offset
                );
            }
            if (rule.get("locale") != null && !String.valueOf(rule.get("locale")).isBlank()) {
                return resolveByLocale(String.valueOf(rule.get("locale")).trim(), offset, limit);
            }
            if (rule.get("last_pay_days") != null) {
                int days = toPositiveInt(rule.get("last_pay_days"), 30);
                return jdbcTemplate.queryForList(
                        """
                                SELECT DISTINCT mbo.creator_id
                                FROM mystery_box_order mbo
                                JOIN payment p ON p.id = mbo.id
                                WHERE p.pay_time IS NOT NULL
                                  AND p.pay_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
                                ORDER BY mbo.creator_id
                                LIMIT ? OFFSET ?
                                """,
                        String.class,
                        days,
                        limit,
                        offset
                );
            }
            if (rule.get("spend_tier") != null && !String.valueOf(rule.get("spend_tier")).isBlank()) {
                return resolveBySpendTier(String.valueOf(rule.get("spend_tier")).trim(), offset, limit);
            }
        } catch (Exception ignored) {
            return List.of();
        }
        return allUserIds(offset, limit);
    }

    private List<String> resolveByLocale(String locale, int offset, int limit) {
        String normalized = locale.toLowerCase();
        if (normalized.startsWith("vi")) {
            return jdbcTemplate.queryForList(
                    """
                            SELECT u.id
                            FROM user u
                            LEFT JOIN user_compliance c ON c.user_id = u.id
                            WHERE u.phone LIKE '+84%' OR c.id_region = 'VN'
                            ORDER BY u.id
                            LIMIT ? OFFSET ?
                            """,
                    String.class,
                    limit,
                    offset
            );
        }
        if (normalized.startsWith("zh")) {
            return jdbcTemplate.queryForList(
                    """
                            SELECT u.id
                            FROM user u
                            LEFT JOIN user_compliance c ON c.user_id = u.id
                            WHERE u.phone LIKE '+86%' OR u.phone REGEXP '^1[3-9][0-9]{9}$' OR c.id_region = 'CN'
                            ORDER BY u.id
                            LIMIT ? OFFSET ?
                            """,
                    String.class,
                    limit,
                    offset
            );
        }
        return allUserIds(offset, limit);
    }

    /**
     * Simple lifetime spend tiers from paid mystery-box orders (VND-friendly thresholds).
     * low &lt; 100k; mid 100k–1M; high ≥ 1M.
     */
    private List<String> resolveBySpendTier(String tier, int offset, int limit) {
        String having = switch (tier.toLowerCase()) {
            case "low" -> "SUM(p.pay_amount) < 100000";
            case "mid", "medium" -> "SUM(p.pay_amount) >= 100000 AND SUM(p.pay_amount) < 1000000";
            case "high" -> "SUM(p.pay_amount) >= 1000000";
            default -> null;
        };
        if (having == null) {
            return List.of();
        }
        String sql = """
                SELECT creator_id FROM (
                    SELECT mbo.creator_id AS creator_id
                    FROM mystery_box_order mbo
                    JOIN payment p ON p.id = mbo.id
                    WHERE p.pay_time IS NOT NULL
                    GROUP BY mbo.creator_id
                    HAVING %s
                ) t
                ORDER BY creator_id
                LIMIT ? OFFSET ?
                """.formatted(having);
        return jdbcTemplate.queryForList(sql, String.class, limit, offset);
    }

    private static int toPositiveInt(Object raw, int fallback) {
        try {
            int value = Integer.parseInt(String.valueOf(raw).trim());
            return value > 0 ? value : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private List<String> allUserIds(int offset, int limit) {
        return jdbcTemplate.queryForList(
                "SELECT id FROM user ORDER BY id LIMIT ? OFFSET ?",
                String.class,
                limit,
                offset
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

    public record SegmentDryRun(String taskId, String segmentId, int matchedUserCount) {
    }

    public record Ticket(String id, String userId, String title, String content, String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    }
}

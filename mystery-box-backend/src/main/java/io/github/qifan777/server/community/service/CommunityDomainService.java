package io.github.qifan777.server.community.service;

import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityDomainService {
    private final AuditTrailService auditTrailService;
    private final JdbcTemplate jdbcTemplate;

    @Value("${app.community.auto-approve:false}")
    private boolean communityAutoApprove;
    private static final List<String> SENSITIVE_WORDS = List.of(
            "赌博", "诈骗", "刷单", "涉黄",
            "lừa đảo", "cờ bạc", "rửa tiền", "khiêu dâm", "ma túy", "cá cược",
            "scam", "fraud", "gambling", "porn", "money laundering", "betting"
    );

    public List<CommunityPost> listPosts() {
        return listPostsPage(1, 500).items();
    }

    public CommunityPostPage listPostsPage(int pageNum, int pageSize) {
        int safePage = Math.max(pageNum, 1);
        int safeSize = Math.min(Math.max(pageSize, 1), 50);
        int offset = (safePage - 1) * safeSize;
        List<PostRow> rows = jdbcTemplate.query(
                """
                SELECT p.id, p.author_id, p.content, p.order_id, p.status, p.created_time,
                       COALESCE(NULLIF(TRIM(u.nickname), ''),
                                CONCAT(SUBSTRING(u.phone, 1, 3), '****', SUBSTRING(u.phone, -4)),
                                p.author_id) AS author_display_name
                FROM community_post p
                LEFT JOIN user u ON p.author_id = u.id
                WHERE p.status = 'APPROVED'
                ORDER BY p.created_time DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new PostRow(
                        rs.getString("id"),
                        rs.getString("author_id"),
                        rs.getString("author_display_name"),
                        rs.getString("content"),
                        rs.getString("order_id"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                safeSize,
                offset
        );
        List<CommunityPost> items = hydratePostsBatch(rows);
        Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_post WHERE status = 'APPROVED'",
                Integer.class
        );
        int totalCount = total == null ? 0 : total;
        boolean hasMore = offset + items.size() < totalCount;
        return new CommunityPostPage(items, hasMore);
    }

    public int markNotificationsRead(String actorId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        Object[] args = new Object[ids.size() + 1];
        args[0] = actorId;
        for (int i = 0; i < ids.size(); i++) {
            args[i + 1] = ids.get(i);
        }
        return jdbcTemplate.update(
                "UPDATE community_notification SET read_status = 1 WHERE receiver_id = ? AND id IN (" + placeholders + ")",
                args
        );
    }

    public CommunityPost createPost(String actorId, String content, String orderId, String traceId) {
        assertActionFrequency(actorId, "post", 5, 10);
        String id = uuid();
        LocalDateTime now = LocalDateTime.now();
        String sanitizedContent = sanitizeContent(content);
        String status = communityAutoApprove ? "APPROVED" : "PENDING";
        jdbcTemplate.update(
                "INSERT INTO community_post(id, author_id, content, order_id, status, created_time, edited_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, actorId, sanitizedContent, orderId, status, now, now
        );
        CommunityPost post = hydratePost(id, actorId, actorId, sanitizedContent, orderId, status, now);
        auditTrailService.record("COMMUNITY_POST_CREATE", actorId, "post", id, traceId, Map.of("content", sanitizedContent, "orderId", orderId == null ? "" : orderId));
        return post;
    }

    public CommunityPost commentPost(String actorId, String postId, String content, String traceId) {
        assertActionFrequency(actorId, "comment", 12, 10);
        CommunityPost post = requirePost(postId);
        String id = uuid();
        LocalDateTime now = LocalDateTime.now();
        String sanitizedContent = sanitizeContent(content);
        jdbcTemplate.update(
                "INSERT INTO community_comment(id, post_id, author_id, content, created_time, edited_time) VALUES (?, ?, ?, ?, ?, ?)",
                id, postId, actorId, sanitizedContent, now, now
        );
        createNotification(post.authorId(), "评论了你的帖子");
        auditTrailService.record("COMMUNITY_POST_COMMENT", actorId, "post", post.id(), traceId, Map.of("content", sanitizedContent));
        return requirePost(postId);
    }

    public CommunityPost toggleLike(String actorId, String postId, String traceId) {
        assertActionFrequency(actorId, "like", 30, 5);
        CommunityPost post = requirePost(postId);
        Integer likeCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_like WHERE post_id = ? AND user_id = ?",
                Integer.class, postId, actorId
        );
        if (likeCount != null && likeCount > 0) {
            jdbcTemplate.update("DELETE FROM community_like WHERE post_id = ? AND user_id = ?", postId, actorId);
        } else {
            jdbcTemplate.update(
                    "INSERT INTO community_like(post_id, user_id, created_time) VALUES (?, ?, ?)",
                    postId, actorId, LocalDateTime.now()
            );
            createNotification(post.authorId(), "赞了你的帖子");
        }
        int nextLikedCount = likeUsers(postId).size();
        auditTrailService.record("COMMUNITY_POST_LIKE_TOGGLE", actorId, "post", post.id(), traceId, Map.of("likedCount", nextLikedCount));
        return requirePost(postId);
    }

    public int follow(String actorId, String targetUserId, String traceId) {
        assertActionFrequency(actorId, "follow", 20, 10);
        jdbcTemplate.update(
                "INSERT INTO community_follow(user_id, target_user_id, created_time) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE created_time = VALUES(created_time)",
                actorId, targetUserId, LocalDateTime.now()
        );
        createNotification(targetUserId, "有新用户关注了你");
        auditTrailService.record("COMMUNITY_FOLLOW", actorId, "user", targetUserId, traceId, Map.of());
        Integer total = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_follow WHERE user_id = ?",
                Integer.class,
                actorId
        );
        return total == null ? 0 : total;
    }

    public List<CommunityNotification> listNotifications(String actorId) {
        return jdbcTemplate.query(
                "SELECT id, receiver_id, content, read_status, created_time FROM community_notification WHERE receiver_id = ? ORDER BY created_time DESC",
                (rs, rowNum) -> new CommunityNotification(
                        rs.getString("id"),
                        rs.getString("receiver_id"),
                        rs.getString("content"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getBoolean("read_status")
                ),
                actorId
        );
    }

    public CommunityReport createReport(String actorId, String targetType, String targetId, String reason, String traceId) {
        String id = uuid();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                "INSERT INTO community_report(id, reporter_id, target_type, target_id, reason, status, remark, created_time, edited_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, actorId, targetType, targetId, reason, "PENDING", "", now, now
        );
        auditTrailService.record("COMMUNITY_REPORT_CREATE", actorId, targetType, targetId, traceId, Map.of("reason", reason));
        return requireReport(id);
    }

    public List<CommunityReport> listReports(String status) {
        return jdbcTemplate.query(
                "SELECT id, reporter_id, target_type, target_id, reason, status, remark, created_time, edited_time FROM community_report WHERE (? = '' OR status = ?) ORDER BY created_time DESC",
                (rs, rowNum) -> new CommunityReport(
                        rs.getString("id"),
                        rs.getString("reporter_id"),
                        rs.getString("target_type"),
                        rs.getString("target_id"),
                        rs.getString("reason"),
                        rs.getString("status"),
                        rs.getString("remark"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                ),
                status == null ? "" : status,
                status == null ? "" : status
        );
    }

    public CommunityReport moderateReport(String actorId, String reportId, String nextStatus, String remark, String traceId) {
        CommunityReport report = requireReport(reportId);
        jdbcTemplate.update(
                "UPDATE community_report SET status = ?, remark = ?, edited_time = ? WHERE id = ?",
                nextStatus, remark == null ? "" : remark, LocalDateTime.now(), reportId
        );
        if ("post".equalsIgnoreCase(report.targetType()) && StringUtils.hasText(report.targetId())) {
            String postStatus = "REJECTED".equalsIgnoreCase(nextStatus) ? "REJECTED" : "APPROVED";
            jdbcTemplate.update(
                    "UPDATE community_post SET status = ?, edited_time = ? WHERE id = ?",
                    postStatus, LocalDateTime.now(), report.targetId()
            );
        }
        auditTrailService.record("COMMUNITY_REPORT_MODERATE", actorId, "report", reportId, traceId, Map.of("status", nextStatus, "remark", remark));
        return requireReport(reportId);
    }

    public CommunityPost moderatePost(String actorId, String postId, String nextStatus, String traceId) {
        requirePost(postId);
        jdbcTemplate.update(
                "UPDATE community_post SET status = ?, edited_time = ? WHERE id = ?",
                nextStatus, LocalDateTime.now(), postId
        );
        auditTrailService.record("COMMUNITY_POST_MODERATE", actorId, "post", postId, traceId, Map.of("status", nextStatus));
        return requirePost(postId);
    }

    private CommunityPost requirePost(String postId) {
        List<CommunityPost> posts = jdbcTemplate.query(
                "SELECT id, author_id, content, order_id, status, created_time FROM community_post WHERE id = ?",
                (rs, rowNum) -> hydratePost(
                        rs.getString("id"),
                        rs.getString("author_id"),
                        rs.getString("author_id"),
                        rs.getString("content"),
                        rs.getString("order_id"),
                        rs.getString("status"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                postId
        );
        if (posts.isEmpty()) {
            throw new BusinessException(ResultCode.NotFindError, "帖子不存在");
        }
        return posts.get(0);
    }

    private CommunityReport requireReport(String reportId) {
        List<CommunityReport> reports = jdbcTemplate.query(
                "SELECT id, reporter_id, target_type, target_id, reason, status, remark, created_time, edited_time FROM community_report WHERE id = ?",
                (rs, rowNum) -> new CommunityReport(
                        rs.getString("id"),
                        rs.getString("reporter_id"),
                        rs.getString("target_type"),
                        rs.getString("target_id"),
                        rs.getString("reason"),
                        rs.getString("status"),
                        rs.getString("remark"),
                        rs.getTimestamp("created_time").toLocalDateTime(),
                        rs.getTimestamp("edited_time").toLocalDateTime()
                ),
                reportId
        );
        if (reports.isEmpty()) {
            throw new BusinessException(ResultCode.NotFindError, "举报不存在");
        }
        return reports.get(0);
    }

    private List<CommunityPost> hydratePostsBatch(List<PostRow> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<String> postIds = rows.stream().map(PostRow::id).toList();
        Map<String, List<CommunityComment>> commentsByPost = batchCommentsByPost(postIds);
        Map<String, List<String>> likesByPost = batchLikesByPost(postIds);
        List<CommunityPost> items = new ArrayList<>(rows.size());
        for (PostRow row : rows) {
            items.add(new CommunityPost(
                    row.id(),
                    row.authorId(),
                    row.authorDisplayName(),
                    row.content(),
                    row.orderId(),
                    row.createdAt(),
                    row.status(),
                    commentsByPost.getOrDefault(row.id(), List.of()),
                    likesByPost.getOrDefault(row.id(), List.of())
            ));
        }
        return items;
    }

    private CommunityPost hydratePost(
            String id,
            String authorId,
            String authorDisplayName,
            String content,
            String orderId,
            String status,
            LocalDateTime createdAt
    ) {
        return hydratePostsBatch(List.of(new PostRow(id, authorId, authorDisplayName, content, orderId, status, createdAt))).get(0);
    }

    private Map<String, List<CommunityComment>> batchCommentsByPost(List<String> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = postIds.stream().map(id -> "?").collect(Collectors.joining(","));
        Map<String, List<CommunityComment>> grouped = new HashMap<>();
        jdbcTemplate.query(
                "SELECT post_id, id, author_id, content, created_time FROM community_comment WHERE post_id IN ("
                        + placeholders + ") ORDER BY created_time ASC",
                rs -> {
                    String postId = rs.getString("post_id");
                    grouped.computeIfAbsent(postId, key -> new ArrayList<>()).add(
                            new CommunityComment(
                                    rs.getString("id"),
                                    rs.getString("author_id"),
                                    rs.getString("content"),
                                    rs.getTimestamp("created_time").toLocalDateTime()
                            )
                    );
                },
                postIds.toArray()
        );
        return grouped;
    }

    private Map<String, List<String>> batchLikesByPost(List<String> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = postIds.stream().map(id -> "?").collect(Collectors.joining(","));
        Map<String, List<String>> grouped = new HashMap<>();
        jdbcTemplate.query(
                "SELECT post_id, user_id FROM community_like WHERE post_id IN (" + placeholders + ")",
                rs -> {
                    String postId = rs.getString("post_id");
                    grouped.computeIfAbsent(postId, key -> new ArrayList<>()).add(rs.getString("user_id"));
                },
                postIds.toArray()
        );
        return grouped;
    }

    private record PostRow(
            String id,
            String authorId,
            String authorDisplayName,
            String content,
            String orderId,
            String status,
            LocalDateTime createdAt
    ) {
    }

    private List<CommunityComment> commentsByPost(String postId) {
        return jdbcTemplate.query(
                "SELECT id, author_id, content, created_time FROM community_comment WHERE post_id = ? ORDER BY created_time ASC",
                (rs, rowNum) -> new CommunityComment(
                        rs.getString("id"),
                        rs.getString("author_id"),
                        rs.getString("content"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                postId
        );
    }

    private List<String> likeUsers(String postId) {
        return jdbcTemplate.query(
                "SELECT user_id FROM community_like WHERE post_id = ?",
                (rs, rowNum) -> rs.getString("user_id"),
                postId
        );
    }

    private void createNotification(String receiverId, String content) {
        jdbcTemplate.update(
                "INSERT INTO community_notification(id, receiver_id, content, read_status, created_time) VALUES (?, ?, ?, ?, ?)",
                uuid(), receiverId, content, false, LocalDateTime.now()
        );
    }

    private String sanitizeContent(String content) {
        String next = content == null ? "" : content;
        String lower = next.toLowerCase();
        for (String sensitiveWord : SENSITIVE_WORDS) {
            if (sensitiveWord.chars().anyMatch(ch -> ch > 127)) {
                if (next.contains(sensitiveWord)) {
                    next = next.replace(sensitiveWord, "***");
                }
            } else if (lower.contains(sensitiveWord.toLowerCase())) {
                next = next.replaceAll("(?i)" + java.util.regex.Pattern.quote(sensitiveWord), "***");
                lower = next.toLowerCase();
            }
        }
        return next;
    }

    private void assertActionFrequency(String actorId, String action, int maxCount, int windowMinutes) {
        Integer postCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_post WHERE author_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                actorId,
                windowMinutes
        );
        Integer commentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_comment WHERE author_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                actorId,
                windowMinutes
        );
        Integer likeCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_like WHERE user_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                actorId,
                windowMinutes
        );
        Integer followCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_follow WHERE user_id = ? AND created_time >= DATE_SUB(NOW(), INTERVAL ? MINUTE)",
                Integer.class,
                actorId,
                windowMinutes
        );
        int value = switch (action) {
            case "post" -> postCount == null ? 0 : postCount;
            case "comment" -> commentCount == null ? 0 : commentCount;
            case "follow" -> followCount == null ? 0 : followCount;
            default -> likeCount == null ? 0 : likeCount;
        };
        if (value >= maxCount) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "操作过于频繁，请稍后再试");
        }
    }

    private static String uuid() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public record CommunityPostPage(List<CommunityPost> items, boolean hasMore) {
    }

    public record CommunityPost(
            String id,
            String authorId,
            String authorDisplayName,
            String content,
            String orderId,
            LocalDateTime createdAt,
            String status,
            List<CommunityComment> comments,
            List<String> likes
    ) {
    }

    public record CommunityComment(
            String id,
            String authorId,
            String content,
            LocalDateTime createdAt
    ) {
    }

    public record CommunityNotification(
            String id,
            String receiverId,
            String content,
            LocalDateTime createdAt,
            boolean read
    ) {
    }

    public record CommunityReport(
            String id,
            String reporterId,
            String targetType,
            String targetId,
            String reason,
            String status,
            String remark,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }
}

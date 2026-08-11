package io.github.qifan777.server.teamlottery;

import cn.hutool.core.util.IdUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TeamLotteryService {
    public static final int MAX_MEMBERS = TeamLotteryRules.MAX_MEMBERS;
    public static final int TEAM_BONUS_DRAWS = TeamLotteryRules.TEAM_BONUS_DRAWS;
    public static final int TEAM_TTL_HOURS = TeamLotteryRules.CHAT_TTL_HOURS;

    private final JdbcTemplate jdbcTemplate;

    @Value("${app.team-lottery.boost-enabled:false}")
    private boolean boostEnabled;

    @Transactional
    public TeamView create(String hostUserId, String boxId, String deviceId, String phoneHash, String ip) {
        assertNotInActiveTeam(hostUserId, deviceId, phoneHash, ip);
        String id = IdUtil.fastSimpleUUID();
        String invite = randomInvite();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                        INSERT INTO team_lottery (
                            id, host_user_id, box_id, status, draw_quota, draws_used, invite_code,
                            device_fingerprint_host, expire_time, created_time
                        ) VALUES (?,?,?,'OPEN',1,0,?,?,?,?)
                        """,
                id,
                hostUserId,
                boxId,
                invite,
                blankToNull(deviceId),
                now.plusHours(TEAM_TTL_HOURS),
                now
        );
        insertMember(id, hostUserId, deviceId, phoneHash, ip);
        postSystem(id, hostUserId, "队伍已创建，邀请好友加入对对碰");
        return get(id, hostUserId);
    }

    @Transactional
    public TeamView join(String userId, String inviteCode, String deviceId, String phoneHash, String ip) {
        assertNotInActiveTeam(userId, deviceId, phoneHash, ip);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, status, expire_time FROM team_lottery WHERE invite_code = ? LIMIT 1",
                inviteCode == null ? "" : inviteCode.trim().toUpperCase(Locale.ROOT)
        );
        if (rows.isEmpty()) {
            throw new BusinessException("TEAM_LOTTERY_INVALID_INVITE: 邀请码无效");
        }
        Map<String, Object> team = rows.get(0);
        if (!"OPEN".equals(team.get("status"))) {
            throw new BusinessException("TEAM_LOTTERY_NOT_JOINABLE: 队伍不可加入");
        }
        LocalDateTime expire = ((java.sql.Timestamp) team.get("expire_time")).toLocalDateTime();
        if (expire.isBefore(LocalDateTime.now())) {
            throw new BusinessException("TEAM_LOTTERY_EXPIRED: 队伍已过期");
        }
        String teamId = (String) team.get("id");
        Integer members = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM team_lottery_member WHERE team_id = ? AND status = 'ACTIVE'",
                Integer.class,
                teamId
        );
        if (members != null && members >= MAX_MEMBERS) {
            throw new BusinessException("TEAM_LOTTERY_FULL: 队伍已满（最多 5 人）");
        }
        insertMember(teamId, userId, deviceId, phoneHash, ip);
        refreshQuota(teamId);
        postSystem(teamId, userId, "新成员加入，触发响应音效");
        return get(teamId, userId);
    }

    @Transactional
    public TeamView lock(String userId, String teamId) {
        requireMember(teamId, userId);
        int updated = jdbcTemplate.update(
                "UPDATE team_lottery SET status = 'LOCKED' WHERE id = ? AND status = 'OPEN'",
                teamId
        );
        if (updated == 0) {
            throw new BusinessException("TEAM_LOTTERY_LOCK_FAILED: 队伍无法锁定");
        }
        refreshQuota(teamId);
        postSystem(teamId, userId, "队伍已锁定，开始共享抽奖");
        return get(teamId, userId);
    }

    @Transactional
    public DrawResult consumeDraw(String userId, String teamId, String orderId, String resultJson) {
        requireMember(teamId, userId);
        if (orderId == null || orderId.isBlank()) {
            throw new BusinessException("TEAM_LOTTERY_UNPAID: 请先完成盲盒下单后再抽奖");
        }
        String trimmedOrderId = orderId.trim();
        Map<String, Object> team = jdbcTemplate.queryForMap(
                "SELECT status, draw_quota, draws_used, box_id FROM team_lottery WHERE id = ?",
                teamId
        );
        String status = (String) team.get("status");
        if (!"LOCKED".equals(status) && !"OPEN".equals(status)) {
            throw new BusinessException("TEAM_LOTTERY_NOT_DRAWABLE: 队伍当前不可抽奖");
        }
        int quota = ((Number) team.get("draw_quota")).intValue();
        int used = ((Number) team.get("draws_used")).intValue();
        if (used >= quota) {
            throw new BusinessException("TEAM_LOTTERY_QUOTA_EXHAUSTED: 队伍抽奖次数已用完");
        }
        String teamBoxId = (String) team.get("box_id");
        assertOrderEligibleForDraw(userId, trimmedOrderId, teamBoxId);
        // Server-side only: never trust client hitHidden.
        boolean hitHidden = resolveHitHiddenFromOrder(trimmedOrderId);

        int claimed = jdbcTemplate.update(
                """
                        UPDATE team_lottery
                        SET draws_used = draws_used + 1
                        WHERE id = ? AND draws_used < draw_quota AND status IN ('LOCKED', 'OPEN')
                        """,
                teamId
        );
        if (claimed != 1) {
            throw new BusinessException("TEAM_LOTTERY_QUOTA_EXHAUSTED: 队伍抽奖次数已用完");
        }
        String drawId = IdUtil.fastSimpleUUID();
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO team_lottery_draw (id, team_id, user_id, order_id, result_json, created_time)
                            VALUES (?,?,?,?,?,?)
                            """,
                    drawId,
                    teamId,
                    userId,
                    trimmedOrderId,
                    resultJson,
                    LocalDateTime.now()
            );
        } catch (org.springframework.dao.DuplicateKeyException dup) {
            // Same paid order reused — roll back the quota bump.
            jdbcTemplate.update(
                    "UPDATE team_lottery SET draws_used = GREATEST(draws_used - 1, 0) WHERE id = ?",
                    teamId
            );
            throw new BusinessException("TEAM_LOTTERY_ORDER_REUSED: 该订单已用于组队抽奖");
        }
        if (hitHidden) {
            grantBoostToAllMembers(teamId, teamBoxId);
            postSystem(teamId, userId, "隐藏款出现！全队获得保底加速卡");
        }
        int newUsed = used + 1;
        if (newUsed >= quota) {
            jdbcTemplate.update("UPDATE team_lottery SET status = 'DRAWN' WHERE id = ?", teamId);
        }
        return new DrawResult(drawId, quota - newUsed, hitHidden);
    }

    public TeamView get(String teamId, String userId) {
        requireMember(teamId, userId);
        Map<String, Object> team = jdbcTemplate.queryForMap(
                """
                        SELECT id, host_user_id, box_id, status, draw_quota, draws_used, invite_code, expire_time, created_time
                        FROM team_lottery WHERE id = ?
                        """,
                teamId
        );
        List<MemberView> members = jdbcTemplate.query(
                """
                        SELECT user_id, device_id, status, joined_time
                        FROM team_lottery_member WHERE team_id = ? ORDER BY joined_time
                        """,
                (rs, i) -> new MemberView(
                        rs.getString("user_id"),
                        rs.getString("device_id"),
                        rs.getString("status"),
                        rs.getTimestamp("joined_time").toLocalDateTime()
                ),
                teamId
        );
        return new TeamView(
                (String) team.get("id"),
                (String) team.get("host_user_id"),
                (String) team.get("box_id"),
                (String) team.get("status"),
                ((Number) team.get("draw_quota")).intValue(),
                ((Number) team.get("draws_used")).intValue(),
                Math.max(0, ((Number) team.get("draw_quota")).intValue() - ((Number) team.get("draws_used")).intValue()),
                (String) team.get("invite_code"),
                ((java.sql.Timestamp) team.get("expire_time")).toLocalDateTime(),
                ((java.sql.Timestamp) team.get("created_time")).toLocalDateTime(),
                members,
                members.size()
        );
    }

    public List<TeamView> mine(String userId) {
        List<String> ids = jdbcTemplate.queryForList(
                """
                        SELECT t.id FROM team_lottery t
                        INNER JOIN team_lottery_member m ON m.team_id = t.id
                        WHERE m.user_id = ? AND m.status = 'ACTIVE' AND t.status IN ('OPEN','LOCKED')
                        ORDER BY t.created_time DESC
                        LIMIT 20
                        """,
                String.class,
                userId
        );
        return ids.stream().map(id -> get(id, userId)).toList();
    }

    public List<ChatMessage> listChat(String teamId, String userId, int limit) {
        requireMember(teamId, userId);
        int size = Math.min(Math.max(limit, 1), 100);
        return jdbcTemplate.query(
                """
                        SELECT id, user_id, msg_type, body, created_time
                        FROM team_lottery_chat WHERE team_id = ?
                        ORDER BY created_time DESC LIMIT ?
                        """,
                (rs, i) -> new ChatMessage(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("msg_type"),
                        rs.getString("body"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                teamId,
                size
        );
    }

    @Transactional
    public void postChat(String teamId, String userId, String msgType, String body) {
        requireMember(teamId, userId);
        String type = msgType == null || msgType.isBlank() ? "TEXT" : msgType.trim().toUpperCase(Locale.ROOT);
        if (body == null || body.isBlank()) {
            throw new BusinessException("TEAM_LOTTERY_EMPTY_MESSAGE: 消息不能为空");
        }
        jdbcTemplate.update(
                """
                        INSERT INTO team_lottery_chat (id, team_id, user_id, msg_type, body, created_time)
                        VALUES (?,?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                teamId,
                userId,
                type,
                body.trim().substring(0, Math.min(body.trim().length(), 500)),
                LocalDateTime.now()
        );
    }

    @Transactional
    public int disbandExpired() {
        return disbandExpiredTeams(100);
    }

    @Transactional
    public int disbandExpiredTeams(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        List<String> ids = jdbcTemplate.queryForList(
                "SELECT id FROM team_lottery WHERE status IN ('OPEN','LOCKED') AND expire_time <= ? LIMIT ?",
                String.class,
                LocalDateTime.now(),
                size
        );
        for (String id : ids) {
            jdbcTemplate.update("UPDATE team_lottery SET status = 'DISBANDED' WHERE id = ?", id);
            postSystem(id, "system", "队伍已超时自动解散");
        }
        return ids.size();
    }

    /** Delegates to {@link TeamLotteryRules#calculateDrawQuota(int, boolean)} (bonus only when locked or full). */
    static int computeQuota(int memberCount, boolean lockedOrFull) {
        return TeamLotteryRules.calculateDrawQuota(memberCount, lockedOrFull);
    }

    private void refreshQuota(String teamId) {
        Integer members = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM team_lottery_member WHERE team_id = ? AND status = 'ACTIVE'",
                Integer.class,
                teamId
        );
        int memberCount = members == null ? 0 : members;
        String status = jdbcTemplate.queryForObject(
                "SELECT status FROM team_lottery WHERE id = ?",
                String.class,
                teamId
        );
        boolean locked = "LOCKED".equals(status);
        boolean lockedOrFull = locked || TeamLotteryRules.isFull(memberCount);
        int quota = TeamLotteryRules.calculateDrawQuota(memberCount, lockedOrFull);
        jdbcTemplate.update("UPDATE team_lottery SET draw_quota = ? WHERE id = ?", quota, teamId);
    }

    /**
     * Order must belong to the user, be paid (pay_time set and/or post-payment status),
     * and its mystery box must match the team box.
     */
    private void assertOrderEligibleForDraw(String userId, String orderId, String expectedBoxId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                        SELECT bo.creator_id AS creator_id,
                               mbo.status AS order_status,
                               p.pay_time AS pay_time,
                               moi.mystery_box_id AS mystery_box_id
                        FROM mystery_box_order mbo
                        INNER JOIN base_order bo ON bo.id = mbo.id
                        LEFT JOIN payment p ON p.id = mbo.id
                        INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id
                        WHERE mbo.id = ?
                        LIMIT 1
                        """,
                orderId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("TEAM_LOTTERY_ORDER_INVALID: 订单不存在或不属于当前用户");
        }
        Map<String, Object> row = rows.get(0);
        if (!userId.equals(String.valueOf(row.get("creator_id")))) {
            throw new BusinessException("TEAM_LOTTERY_ORDER_INVALID: 订单不存在或不属于当前用户");
        }
        String orderStatus = row.get("order_status") == null ? "" : String.valueOf(row.get("order_status"));
        Object payTime = row.get("pay_time");
        if (!isPaidOrder(orderStatus, payTime)) {
            throw new BusinessException("TEAM_LOTTERY_UNPAID: 请先完成订单支付后再抽奖");
        }
        String boxId = row.get("mystery_box_id") == null ? null : String.valueOf(row.get("mystery_box_id"));
        if (expectedBoxId == null || expectedBoxId.isBlank() || !expectedBoxId.equals(boxId)) {
            throw new BusinessException("TEAM_LOTTERY_BOX_MISMATCH: 订单盲盒与队伍盲盒不一致");
        }
    }

    /** Paid when payment.pay_time is set, or mystery_box_order.status is a post-payment state. */
    static boolean isPaidOrder(String orderStatus, Object payTime) {
        String status = orderStatus == null ? "" : orderStatus.trim();
        if ("TO_BE_PAID".equals(status) || "CLOSED".equals(status) || "REFUNDED".equals(status)) {
            return false;
        }
        if (payTime != null) {
            return true;
        }
        return isPostPaymentStatus(status);
    }

    static boolean isPostPaymentStatus(String orderStatus) {
        if (orderStatus == null || orderStatus.isBlank()) {
            return false;
        }
        return switch (orderStatus.trim()) {
            case "TO_BE_DELIVERED", "TO_BE_RECEIVED", "TO_BE_EVALUATED", "FINISHED" -> true;
            default -> false;
        };
    }

    private boolean resolveHitHiddenFromOrder(String orderId) {
        List<String> productsJsonList = jdbcTemplate.query(
                "SELECT products FROM mystery_box_order_item WHERE mystery_box_order_id = ?",
                (rs, i) -> rs.getString("products"),
                orderId
        );
        for (String productsJson : productsJsonList) {
            if (productsJsonContainsHidden(productsJson)) {
                return true;
            }
        }
        return false;
    }

    /** Detect HIDDEN tier from serialized prize products JSON (enum name or keyEnName). */
    static boolean productsJsonContainsHidden(String productsJson) {
        if (productsJson == null || productsJson.isBlank()) {
            return false;
        }
        return HIDDEN_QUALITY_PATTERN.matcher(productsJson).find();
    }

    private static final Pattern HIDDEN_QUALITY_PATTERN = Pattern.compile(
            "\"qualityType\"\\s*:\\s*\"HIDDEN\"|\"keyEnName\"\\s*:\\s*\"HIDDEN\"",
            Pattern.CASE_INSENSITIVE
    );

    private void grantBoostToAllMembers(String teamId, String boxId) {
        if (!boostEnabled) {
            return;
        }
        List<String> userIds = jdbcTemplate.queryForList(
                "SELECT user_id FROM team_lottery_member WHERE team_id = ? AND status = 'ACTIVE'",
                String.class,
                teamId
        );
        for (String uid : userIds) {
            jdbcTemplate.update(
                    """
                            INSERT INTO team_lottery_boost (user_id, box_id, boost_count, edited_time)
                            VALUES (?,?,1,?)
                            ON DUPLICATE KEY UPDATE boost_count = boost_count + 1, edited_time = VALUES(edited_time)
                            """,
                    uid,
                    boxId,
                    LocalDateTime.now()
            );
        }
    }

    private void insertMember(String teamId, String userId, String deviceId, String phoneHash, String ip) {
        String device = blankToNull(deviceId);
        String phone = blankToNull(phoneHash);
        String clientIp = blankToNull(ip);
        jdbcTemplate.update(
                """
                        INSERT INTO team_lottery_member (id, team_id, user_id, device_id, phone_hash, ip, status, joined_time)
                        VALUES (?,?,?,?,?,?,'ACTIVE',?)
                        """,
                IdUtil.fastSimpleUUID(),
                teamId,
                userId,
                device,
                phone,
                clientIp,
                LocalDateTime.now()
        );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void assertNotInActiveTeam(String userId, String deviceId, String phoneHash, String ip) {
        Integer byUser = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM team_lottery_member m
                        INNER JOIN team_lottery t ON t.id = m.team_id
                        WHERE m.user_id = ? AND m.status = 'ACTIVE' AND t.status IN ('OPEN','LOCKED')
                        """,
                Integer.class,
                userId
        );
        if (byUser != null && byUser > 0) {
            throw new BusinessException("TEAM_LOTTERY_ALREADY_IN_TEAM: 您已在其他进行中的队伍中");
        }
        if (deviceId != null && !deviceId.isBlank()) {
            Integer byDevice = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1) FROM team_lottery_member m
                            INNER JOIN team_lottery t ON t.id = m.team_id
                            WHERE m.device_id = ? AND m.status = 'ACTIVE' AND t.status IN ('OPEN','LOCKED')
                            """,
                    Integer.class,
                    deviceId
            );
            if (byDevice != null && byDevice > 0) {
                throw new BusinessException("TEAM_LOTTERY_DEVICE_LIMIT: 同一设备同时只能加入 1 个队伍");
            }
        }
        if (phoneHash != null && !phoneHash.isBlank()) {
            Integer byPhone = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1) FROM team_lottery_member m
                            INNER JOIN team_lottery t ON t.id = m.team_id
                            WHERE m.phone_hash = ? AND m.status = 'ACTIVE' AND t.status IN ('OPEN','LOCKED')
                            """,
                    Integer.class,
                    phoneHash
            );
            if (byPhone != null && byPhone > 0) {
                throw new BusinessException("TEAM_LOTTERY_PHONE_LIMIT: 同一手机号同时只能加入 1 个队伍");
            }
        }
        if (ip != null && !ip.isBlank()) {
            Integer byIp = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1) FROM team_lottery_member m
                            INNER JOIN team_lottery t ON t.id = m.team_id
                            WHERE m.ip = ? AND m.status = 'ACTIVE' AND t.status IN ('OPEN','LOCKED')
                            """,
                    Integer.class,
                    ip
            );
            if (byIp != null && byIp > 0) {
                throw new BusinessException("TEAM_LOTTERY_NETWORK_LIMIT: 同一网络同时只能加入 1 个队伍");
            }
        }
    }

    private void requireMember(String teamId, String userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM team_lottery_member WHERE team_id = ? AND user_id = ? AND status = 'ACTIVE'",
                Integer.class,
                teamId,
                userId
        );
        if (count == null || count == 0) {
            throw new BusinessException("TEAM_LOTTERY_NOT_MEMBER: 您不是该队伍成员");
        }
    }

    private void postSystem(String teamId, String userId, String body) {
        jdbcTemplate.update(
                """
                        INSERT INTO team_lottery_chat (id, team_id, user_id, msg_type, body, created_time)
                        VALUES (?,?,?,'SYSTEM',?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                teamId,
                userId,
                body,
                LocalDateTime.now()
        );
    }

    private static String randomInvite() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(alphabet.charAt(ThreadLocalRandom.current().nextInt(alphabet.length())));
        }
        return sb.toString();
    }

    public record TeamView(
            String id,
            String hostUserId,
            String boxId,
            String status,
            int drawQuota,
            int drawsUsed,
            int remainingDraws,
            String inviteCode,
            LocalDateTime expireTime,
            LocalDateTime createdTime,
            List<MemberView> members,
            int memberCount
    ) {
    }

    public record MemberView(String userId, String deviceId, String status, LocalDateTime joinedTime) {
    }

    public record ChatMessage(String id, String userId, String msgType, String body, LocalDateTime createdTime) {
    }

    public record DrawResult(String drawId, int remainingQuota, boolean grantedBoost) {
    }
}

package io.github.qifan777.server.newcomer.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.user.hint.UserHintCardService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.service.UserCoinLedgerService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NewcomerMissionService {
    private static final List<MissionTemplate> TEMPLATES = List.of(
            new MissionTemplate(1, "FIRST_DRAW", "完成首次开盒", 1, 20, 0),
            new MissionTemplate(2, "CHECK_IN", "完成一次签到", 1, 0, 1),
            new MissionTemplate(3, "FAVORITE", "收藏一个盲盒", 1, 30, 0),
            new MissionTemplate(4, "COMMUNITY_POST", "发布一条晒单", 1, 0, 1),
            new MissionTemplate(5, "SECOND_DRAW", "累计开盒 2 次", 2, 50, 0),
            new MissionTemplate(6, "CHECK_IN_STREAK", "连续签到 3 天", 3, 0, 2),
            new MissionTemplate(7, "FINALE", "领取全部新人奖励", 6, 100, 3)
    );

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final UserHintCardService userHintCardService;
    private final UserCoinLedgerService userCoinLedgerService;

    @Transactional
    public List<MissionView> listMissions(String userId) {
        ensureRows(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("用户不存在"));
        int unlockedDay = unlockedDayIndex(user.createdTime().toLocalDate());
        Map<Integer, ClaimRow> claims = loadClaims(userId);
        ProgressSnapshot progress = loadProgress(userId);
        List<MissionView> views = new ArrayList<>(TEMPLATES.size());
        for (MissionTemplate template : TEMPLATES) {
            ClaimRow claim = claims.get(template.dayIndex());
            int current = template.progress(progress);
            boolean completed = current >= template.target();
            boolean unlocked = template.dayIndex() <= unlockedDay;
            boolean claimed = claim != null && claim.claimed();
            views.add(new MissionView(
                    claim == null ? null : claim.id(),
                    template.dayIndex(),
                    template.missionKey(),
                    template.title(),
                    template.target(),
                    current,
                    completed,
                    unlocked,
                    claimed,
                    claim == null ? null : claim.claimedAt(),
                    template.rewardCoins(),
                    template.rewardHintCards()
            ));
        }
        return views;
    }

    @Transactional
    public MissionView claim(String userId, String missionId) {
        ClaimRow row = jdbcTemplate.query(
                """
                        SELECT id, user_id, day_index, claimed, claimed_at
                        FROM user_newcomer_mission
                        WHERE id = ? AND user_id = ?
                        """,
                rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    return new ClaimRow(
                            rs.getString("id"),
                            rs.getInt("day_index"),
                            rs.getBoolean("claimed"),
                            rs.getTimestamp("claimed_at") == null
                                    ? null
                                    : rs.getTimestamp("claimed_at").toLocalDateTime()
                    );
                },
                missionId,
                userId
        );
        if (row == null) {
            throw new BusinessException("任务不存在");
        }
        if (row.claimed()) {
            throw new BusinessException("奖励已领取");
        }
        MissionTemplate template = TEMPLATES.stream()
                .filter(item -> item.dayIndex() == row.dayIndex())
                .findFirst()
                .orElseThrow(() -> new BusinessException("任务配置不存在"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("用户不存在"));
        int unlockedDay = unlockedDayIndex(user.createdTime().toLocalDate());
        if (template.dayIndex() > unlockedDay) {
            throw new BusinessException("任务尚未解锁");
        }
        ProgressSnapshot progress = loadProgress(userId);
        if (template.progress(progress) < template.target()) {
            throw new BusinessException("任务尚未完成");
        }
        jdbcTemplate.update(
                """
                        UPDATE user_newcomer_mission
                        SET claimed = 1, claimed_at = NOW(6), edited_time = NOW(6)
                        WHERE id = ? AND user_id = ? AND claimed = 0
                        """,
                missionId,
                userId
        );
        if (template.rewardCoins() > 0) {
            userCoinLedgerService.credit(
                    userId,
                    UserCoinLedgerService.COIN_TYPE_LUCKY,
                    template.rewardCoins(),
                    "NEWCOMER_MISSION",
                    "newcomer_mission:" + missionId
            );
        }
        if (template.rewardHintCards() > 0) {
            userHintCardService.grant(userId, template.rewardHintCards());
        }
        return listMissions(userId).stream()
                .filter(view -> missionId.equals(view.id()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("任务不存在"));
    }

    private void ensureRows(String userId) {
        Map<Integer, ClaimRow> existing = loadClaims(userId);
        LocalDateTime now = LocalDateTime.now();
        for (MissionTemplate template : TEMPLATES) {
            if (existing.containsKey(template.dayIndex())) {
                continue;
            }
            jdbcTemplate.update(
                    """
                            INSERT INTO user_newcomer_mission(id, user_id, day_index, claimed, created_time, edited_time)
                            VALUES (?, ?, ?, 0, ?, ?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    userId,
                    template.dayIndex(),
                    now,
                    now
            );
        }
    }

    private Map<Integer, ClaimRow> loadClaims(String userId) {
        return jdbcTemplate.query(
                """
                        SELECT id, day_index, claimed, claimed_at
                        FROM user_newcomer_mission
                        WHERE user_id = ?
                        """,
                rs -> {
                    Map<Integer, ClaimRow> map = new java.util.HashMap<>();
                    while (rs.next()) {
                        int dayIndex = rs.getInt("day_index");
                        map.put(dayIndex, new ClaimRow(
                                rs.getString("id"),
                                dayIndex,
                                rs.getBoolean("claimed"),
                                rs.getTimestamp("claimed_at") == null
                                        ? null
                                        : rs.getTimestamp("claimed_at").toLocalDateTime()
                        ));
                    }
                    return map;
                },
                userId
        );
    }

    private ProgressSnapshot loadProgress(String userId) {
        Integer paidOrders = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1)
                        FROM mystery_box_order mbo
                        JOIN payment p ON p.id = mbo.id
                        WHERE mbo.creator_id = ? AND p.pay_time IS NOT NULL
                        """,
                Integer.class,
                userId
        );
        Integer checkIns = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_check_in WHERE user_id = ?",
                Integer.class,
                userId
        );
        Integer favorites = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_favorite WHERE user_id = ?",
                Integer.class,
                userId
        );
        Integer posts = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM community_post WHERE author_id = ?",
                Integer.class,
                userId
        );
        Integer claimedMissions = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1)
                        FROM user_newcomer_mission
                        WHERE user_id = ? AND claimed = 1 AND day_index < 7
                        """,
                Integer.class,
                userId
        );
        int streak = computeCheckInStreak(userId);
        return new ProgressSnapshot(
                paidOrders == null ? 0 : paidOrders,
                checkIns == null ? 0 : checkIns,
                favorites == null ? 0 : favorites,
                posts == null ? 0 : posts,
                streak,
                claimedMissions == null ? 0 : claimedMissions
        );
    }

    private int computeCheckInStreak(String userId) {
        List<LocalDate> dates = jdbcTemplate.query(
                """
                        SELECT check_in_date
                        FROM user_check_in
                        WHERE user_id = ?
                        ORDER BY check_in_date DESC
                        LIMIT 30
                        """,
                (rs, rowNum) -> rs.getDate("check_in_date").toLocalDate(),
                userId
        );
        if (dates.isEmpty()) {
            return 0;
        }
        int streak = 0;
        LocalDate cursor = LocalDate.now();
        for (LocalDate date : dates) {
            if (!date.equals(cursor)) {
                break;
            }
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private static int unlockedDayIndex(LocalDate registeredDate) {
        long days = ChronoUnit.DAYS.between(registeredDate, LocalDate.now()) + 1;
        return (int) Math.max(1, Math.min(7, days));
    }

    public static List<MissionTemplateDefinition> templateDefinitions() {
        return TEMPLATES.stream()
                .map(item -> new MissionTemplateDefinition(
                        item.dayIndex(),
                        item.missionKey(),
                        item.title(),
                        item.target(),
                        item.rewardCoins(),
                        item.rewardHintCards()
                ))
                .toList();
    }

    private record MissionTemplate(
            int dayIndex,
            String missionKey,
            String title,
            int target,
            int rewardCoins,
            int rewardHintCards
    ) {
        int progress(ProgressSnapshot snapshot) {
            return switch (missionKey) {
                case "FIRST_DRAW" -> Math.min(snapshot.paidOrders(), 1);
                case "CHECK_IN" -> snapshot.checkIns() > 0 ? 1 : 0;
                case "FAVORITE" -> snapshot.favorites() > 0 ? 1 : 0;
                case "COMMUNITY_POST" -> snapshot.posts() > 0 ? 1 : 0;
                case "SECOND_DRAW" -> Math.min(snapshot.paidOrders(), target);
                case "CHECK_IN_STREAK" -> Math.min(snapshot.checkInStreak(), target);
                case "FINALE" -> snapshot.claimedMissions();
                default -> 0;
            };
        }
    }

    private record ProgressSnapshot(
            int paidOrders,
            int checkIns,
            int favorites,
            int posts,
            int checkInStreak,
            int claimedMissions
    ) {
    }

    private record ClaimRow(String id, int dayIndex, boolean claimed, LocalDateTime claimedAt) {
    }

    public record MissionView(
            String id,
            int dayIndex,
            String missionKey,
            String title,
            int target,
            int progress,
            boolean completed,
            boolean unlocked,
            boolean claimed,
            LocalDateTime claimedAt,
            int rewardCoins,
            int rewardHintCards
    ) {
    }

    public record MissionTemplateDefinition(
            int dayIndex,
            String missionKey,
            String title,
            int target,
            int rewardCoins,
            int rewardHintCards
    ) {
    }
}

package io.github.qifan777.server.box.pity.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MysteryBoxUserPityService {
    public static final String COMPENSATE_CODE = MoneyPathErrorCode.PITY_STOCK_EXHAUSTED.name();

    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;
    private final MarketProperties marketProperties;

    /**
     * Comma-separated price:threshold pairs, e.g. {@code 0:80,50:60,100:50,200:40}.
     * Highest price floor that the box price meets wins; falls back to box.pityThreshold.
     */
    @Value("${app.pity.price-thresholds:}")
    private String priceThresholdsConfig;

    @Value("${app.pity.compensate-points:100}")
    private BigDecimal compensatePoints;

    /** When &gt; 0, points = max(configured floor, round(boxPrice * rate)). Default floor remains 100. */
    @Value("${app.pity.compensate-points-rate:0}")
    private BigDecimal compensatePointsRate;

    public PityProgressView progress(String userId, String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int threshold = resolveThreshold(box);
        int current = loadDrawsSinceHigh(userId, mysteryBoxId);
        int remaining = Math.max(threshold - current, 0);
        String compensateStatus = loadCompensateStatus(userId, mysteryBoxId);
        return new PityProgressView(current, threshold, remaining, compensateStatus);
    }

    /**
     * Admin {@code pityThreshold} wins when set; otherwise price-tier YAML, else 50.
     */
    public int resolveThreshold(MysteryBox box) {
        if (box.pityThreshold() > 0) {
            return box.pityThreshold();
        }
        int fromPrice = thresholdForPrice(box.price());
        if (fromPrice > 0) {
            return fromPrice;
        }
        return 50;
    }

    public int thresholdForPrice(BigDecimal price) {
        if (priceThresholdsConfig == null || priceThresholdsConfig.isBlank() || price == null) {
            return 0;
        }
        double boxPrice = price.doubleValue();
        int bestFloor = -1;
        int bestThreshold = 0;
        for (String part : priceThresholdsConfig.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String[] pair = trimmed.split(":");
            if (pair.length != 2) {
                continue;
            }
            try {
                int floor = (int) Double.parseDouble(pair[0].trim());
                int threshold = Integer.parseInt(pair[1].trim());
                if (boxPrice >= floor && floor >= bestFloor && threshold > 0) {
                    bestFloor = floor;
                    bestThreshold = threshold;
                }
            } catch (NumberFormatException ignored) {
                // skip malformed entry
            }
        }
        return bestThreshold;
    }

    @Transactional
    public void recordDrawResults(String userId, String mysteryBoxId, List<ProductView> products) {
        if (products == null || products.isEmpty()) {
            return;
        }
        for (ProductView product : products) {
            DictConstants.QualityType q = product.getQualityType();
            if (q == DictConstants.QualityType.LEGENDARY || q == DictConstants.QualityType.HIDDEN) {
                reset(userId, mysteryBoxId);
                return;
            }
        }
        increment(userId, mysteryBoxId, products.size());
    }

    public boolean shouldForceHigh(String userId, String mysteryBoxId) {
        PityProgressView view = progress(userId, mysteryBoxId);
        return view.remaining() <= 0 && view.threshold() > 0;
    }

    public int loseStreak(String userId, String mysteryBoxId) {
        return loadDrawsSinceHigh(userId, mysteryBoxId);
    }

    public int userDrawCountOnBox(String userId, String mysteryBoxId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_draw_log WHERE user_id = ? AND mystery_box_id = ?",
                Integer.class,
                userId,
                mysteryBoxId
        );
        return count == null ? 0 : count;
    }

    /** Clears pity progress after a successful refund so the user does not keep a free streak. */
    @Transactional
    public void clearOnRefund(String userId, String mysteryBoxId) {
        if (userId == null || mysteryBoxId == null) {
            return;
        }
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_user_pity
                        SET draws_since_high = 0, compensate_status = NULL, compensate_choice = NULL,
                            compensate_time = NULL, edited_time = ?
                        WHERE user_id = ? AND mystery_box_id = ?
                        """,
                LocalDateTime.now(),
                userId,
                mysteryBoxId
        );
    }

    /**
     * Independent transaction so PENDING survives rollback of the failed draw/order txn.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompensatePending(String userId, String mysteryBoxId) {
        ensureRow(userId, mysteryBoxId);
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_user_pity
                        SET compensate_status = 'PENDING', edited_time = ?
                        WHERE user_id = ? AND mystery_box_id = ?
                        """,
                LocalDateTime.now(),
                userId,
                mysteryBoxId
        );
    }

    /** After cash auto-refund for pity stock, block POINTS double-pay. */
    @Transactional
    public void markCompensateCashRefunded(String userId, String mysteryBoxId) {
        if (userId == null || mysteryBoxId == null) {
            return;
        }
        ensureRow(userId, mysteryBoxId);
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_user_pity
                        SET compensate_status = 'CASH_REFUNDED', compensate_choice = 'CASH',
                            compensate_time = ?, edited_time = ?
                        WHERE user_id = ? AND mystery_box_id = ?
                          AND (compensate_status IS NULL OR compensate_status IN ('PENDING', 'WAIT'))
                        """,
                LocalDateTime.now(),
                LocalDateTime.now(),
                userId,
                mysteryBoxId
        );
    }

    /**
     * After high-tier stock is replenished, clear WAIT/PENDING so users can draw again
     * (or re-trigger compensate only if forceHigh fires with empty stock again).
     * Notifies waiting users with category RESTOCK (refId = mysteryBoxId).
     */
    @Transactional
    public void clearCompensateWaitOnRestock(String mysteryBoxId) {
        if (mysteryBoxId == null || mysteryBoxId.isBlank()) {
            return;
        }
        List<String> userIds = jdbcTemplate.queryForList(
                """
                        SELECT user_id FROM mystery_box_user_pity
                        WHERE mystery_box_id = ?
                          AND compensate_status IN ('WAIT', 'PENDING')
                        """,
                String.class,
                mysteryBoxId
        );
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_user_pity
                        SET compensate_status = NULL, compensate_choice = NULL,
                            compensate_time = NULL, edited_time = ?
                        WHERE mystery_box_id = ?
                          AND compensate_status IN ('WAIT', 'PENDING')
                        """,
                LocalDateTime.now(),
                mysteryBoxId
        );
        if (!userIds.isEmpty()) {
            userNotificationService.pushBulk(
                    userIds,
                    "RESTOCK",
                    "高阶赏已补货",
                    "可继续抽取保底奖励",
                    mysteryBoxId
            );
        }
    }

    /**
     * Compensation when forceHigh fired but high-tier stock was gone.
     * WAIT keeps the pity wall armed; POINTS grants wallet credit and resets the streak.
     * POINTS requires PENDING or WAIT; WAIT requires PENDING only.
     */
    @Transactional
    public PityCompensateView compensate(String userId, String mysteryBoxId, String choice) {
        String normalized = choice == null ? "" : choice.trim().toUpperCase(Locale.ROOT);
        if (!"WAIT".equals(normalized) && !"POINTS".equals(normalized)) {
            throw new BusinessException("PITY_COMPENSATE_DENIED: choice 须为 WAIT 或 POINTS");
        }
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        ensureRow(userId, mysteryBoxId);
        String status = normalizeCompensateStatus(loadCompensateStatus(userId, mysteryBoxId));
        if ("WAIT".equals(normalized)) {
            if ("CASH_REFUNDED".equals(status)) {
                throw new BusinessException("PITY_COMPENSATE_DENIED: 已现金退款，无需等待补货");
            }
            if (!"PENDING".equals(status)) {
                throw new BusinessException("PITY_COMPENSATE_DENIED: 仅待处理补偿可登记等待补货");
            }
            jdbcTemplate.update(
                    """
                            UPDATE mystery_box_user_pity
                            SET compensate_status = 'WAIT', compensate_choice = 'WAIT',
                                compensate_time = ?, edited_time = ?
                            WHERE user_id = ? AND mystery_box_id = ?
                            """,
                    LocalDateTime.now(),
                    LocalDateTime.now(),
                    userId,
                    mysteryBoxId
            );
            return new PityCompensateView("WAIT", BigDecimal.ZERO, "PITY_COMPENSATE_WAIT_OK");
        }
        // POINTS: only from PENDING or WAIT (upgrade). Never after cash refund / DONE / POINTS.
        if ("CASH_REFUNDED".equals(status)) {
            throw new BusinessException("PITY_COMPENSATE_DENIED: 已现金退款，不可再领积分补偿");
        }
        if (!"PENDING".equals(status) && !"WAIT".equals(status)) {
            throw new BusinessException("PITY_COMPENSATE_DENIED: 当前不可领取积分补偿");
        }
        BigDecimal points = resolveCompensatePoints(box);
        int updated = jdbcTemplate.update(
                """
                        UPDATE mystery_box_user_pity
                        SET compensate_status = 'POINTS', compensate_choice = 'POINTS',
                            compensate_time = ?, edited_time = ?
                        WHERE user_id = ? AND mystery_box_id = ?
                          AND compensate_status IN ('PENDING', 'WAIT')
                        """,
                LocalDateTime.now(),
                LocalDateTime.now(),
                userId,
                mysteryBoxId
        );
        if (updated != 1) {
            throw new BusinessException("PITY_COMPENSATE_DENIED: 当前不可领取积分补偿");
        }
        userWalletService.credit(userId, points, "PITY_COMPENSATE", "保底库存不足积分补偿", mysteryBoxId);
        reset(userId, mysteryBoxId);
        return new PityCompensateView("POINTS", points, "PITY_COMPENSATE_POINTS_OK");
    }

    public BigDecimal resolveCompensatePoints(MysteryBox box) {
        BigDecimal floor = compensatePoints == null || compensatePoints.compareTo(BigDecimal.ZERO) <= 0
                ? BigDecimal.valueOf(100)
                : compensatePoints;
        if (compensatePointsRate == null
                || compensatePointsRate.compareTo(BigDecimal.ZERO) <= 0
                || box == null
                || box.price() == null) {
            return floor;
        }
        BigDecimal fromPrice = MoneyRounding.round(
                box.price().multiply(compensatePointsRate),
                marketProperties.getCurrency()
        ).setScale(0, RoundingMode.HALF_UP);
        return floor.max(fromPrice);
    }

    private static String normalizeCompensateStatus(String status) {
        if (status == null || status.isBlank()) {
            return "NONE";
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private void increment(String userId, String mysteryBoxId, int delta) {
        if (delta <= 0) {
            return;
        }
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int threshold = resolveThreshold(box);
        LocalDateTime now = LocalDateTime.now();
        // Atomic upsert — avoids COUNT→INSERT race on uk_user_box_pity.
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box_user_pity
                          (id, user_id, mystery_box_id, draws_since_high, pity_threshold, created_time, edited_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          draws_since_high = draws_since_high + VALUES(draws_since_high),
                          pity_threshold = VALUES(pity_threshold),
                          edited_time = VALUES(edited_time)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                mysteryBoxId,
                delta,
                threshold,
                now,
                now
        );
    }

    private void reset(String userId, String mysteryBoxId) {
        jdbcTemplate.update(
                "UPDATE mystery_box_user_pity SET draws_since_high = 0, edited_time = ? WHERE user_id = ? AND mystery_box_id = ?",
                LocalDateTime.now(),
                userId,
                mysteryBoxId
        );
    }

    private void ensureRow(String userId, String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int threshold = resolveThreshold(box);
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box_user_pity
                          (id, user_id, mystery_box_id, draws_since_high, pity_threshold, created_time, edited_time)
                        VALUES (?, ?, ?, 0, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          pity_threshold = VALUES(pity_threshold),
                          edited_time = VALUES(edited_time)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                mysteryBoxId,
                threshold,
                now,
                now
        );
    }

    private int loadDrawsSinceHigh(String userId, String mysteryBoxId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT draws_since_high FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1",
                userId,
                mysteryBoxId
        );
        if (rows.isEmpty()) {
            return 0;
        }
        Object value = rows.get(0).get("draws_since_high");
        return value == null ? 0 : ((Number) value).intValue();
    }

    private String loadCompensateStatus(String userId, String mysteryBoxId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT compensate_status FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ? LIMIT 1",
                    userId,
                    mysteryBoxId
            );
            if (rows.isEmpty()) {
                return null;
            }
            Object value = rows.get(0).get("compensate_status");
            return value == null ? null : value.toString();
        } catch (Exception ex) {
            return null;
        }
    }

    public record PityProgressView(int current, int threshold, int remaining, String compensateStatus) {
        public PityProgressView(int current, int threshold, int remaining) {
            this(current, threshold, remaining, null);
        }
    }

    public record PityCompensateView(String choice, BigDecimal pointsGranted, String message) {
    }
}

package io.github.qifan777.server.reveal.theme;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RevealThemeProgressService {

    static final String PAID_STATUSES = "'TO_BE_DELIVERED','TO_BE_RECEIVED','TO_BE_EVALUATED','FINISHED'";

    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;

    public RevealThemeProgressView get(String userId) {
        StoredProgress stored = loadStored(userId);
        int openCount = Math.max(stored.openCount, countPaidOpens(userId));
        boolean hasHidden = stored.hasHidden || hasHiddenPrize(userId);
        boolean seriesComplete = stored.seriesComplete || anySeriesComplete(userId);
        persistComputed(userId, openCount, hasHidden, seriesComplete, stored.equippedThemeId);
        return new RevealThemeProgressView(openCount, hasHidden, seriesComplete, stored.equippedThemeId);
    }

    @Transactional
    public RevealThemeProgressView recordOpen(String userId, String orderId, boolean hasHidden, boolean seriesComplete) {
        if (!StringUtils.hasText(orderId)) {
            throw new BusinessException("订单不存在");
        }
        assertPaidOwnedOrder(userId, orderId.trim());
        boolean inserted = insertOpen(userId, orderId.trim());
        StoredProgress stored = loadStored(userId);
        int nextCount = inserted ? stored.openCount + 1 : stored.openCount;
        boolean nextHidden = stored.hasHidden || hasHidden;
        boolean nextSeries = stored.seriesComplete || seriesComplete;
        persistComputed(userId, nextCount, nextHidden, nextSeries, stored.equippedThemeId);
        return get(userId);
    }

    @Transactional
    public RevealThemeProgressView equip(String userId, String equippedThemeId) {
        String equipped = StringUtils.hasText(equippedThemeId) ? equippedThemeId.trim() : null;
        jdbcTemplate.update(
                """
                        INSERT INTO user_reveal_theme_progress
                            (user_id, open_count, has_hidden, series_complete, equipped_theme_id)
                        VALUES (?, 0, 0, 0, ?)
                        ON DUPLICATE KEY UPDATE
                            equipped_theme_id = VALUES(equipped_theme_id),
                            edited_time = CURRENT_TIMESTAMP(6)
                        """,
                userId,
                equipped
        );
        return get(userId);
    }

    private void assertPaidOwnedOrder(String userId, String orderId) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (order.creator() == null || !userId.equals(order.creator().id())) {
            throw new BusinessException("无权操作该订单");
        }
        ProductOrderStatus status = order.status();
        if (status == ProductOrderStatus.TO_BE_PAID
                || status == ProductOrderStatus.CLOSED
                || status == ProductOrderStatus.REFUNDED) {
            throw new BusinessException("订单状态不可记录");
        }
    }

    private boolean insertOpen(String userId, String orderId) {
        try {
            int rows = jdbcTemplate.update(
                    "INSERT INTO user_reveal_theme_open (user_id, order_id) VALUES (?, ?)",
                    userId,
                    orderId
            );
            return rows > 0;
        } catch (DuplicateKeyException ignored) {
            return false;
        }
    }

    private void persistComputed(
            String userId,
            int openCount,
            boolean hasHidden,
            boolean seriesComplete,
            String equippedThemeId
    ) {
        jdbcTemplate.update(
                """
                        INSERT INTO user_reveal_theme_progress
                            (user_id, open_count, has_hidden, series_complete, equipped_theme_id)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            open_count = GREATEST(open_count, VALUES(open_count)),
                            has_hidden = has_hidden OR VALUES(has_hidden),
                            series_complete = series_complete OR VALUES(series_complete),
                            equipped_theme_id = COALESCE(equipped_theme_id, VALUES(equipped_theme_id)),
                            edited_time = CURRENT_TIMESTAMP(6)
                        """,
                userId,
                Math.max(openCount, 0),
                hasHidden ? 1 : 0,
                seriesComplete ? 1 : 0,
                equippedThemeId
        );
    }

    private StoredProgress loadStored(String userId) {
        List<StoredProgress> rows = jdbcTemplate.query(
                """
                        SELECT open_count, has_hidden, series_complete, equipped_theme_id
                        FROM user_reveal_theme_progress
                        WHERE user_id = ?
                        """,
                (rs, rowNum) -> new StoredProgress(
                        rs.getInt("open_count"),
                        rs.getInt("has_hidden") != 0,
                        rs.getInt("series_complete") != 0,
                        rs.getString("equipped_theme_id")
                ),
                userId
        );
        return rows.isEmpty() ? new StoredProgress(0, false, false, null) : rows.get(0);
    }

    private int countPaidOpens(String userId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM mystery_box_order mbo
                            INNER JOIN base_order bo ON bo.id = mbo.id
                            WHERE bo.creator_id = ?
                              AND mbo.status IN (%s)
                            """.formatted(PAID_STATUSES),
                    Integer.class,
                    userId
            );
            return count == null ? 0 : count;
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private boolean hasHiddenPrize(String userId) {
        try {
            Integer found = jdbcTemplate.queryForObject(
                    """
                            SELECT EXISTS (
                                SELECT 1
                                FROM mystery_box_order mbo
                                INNER JOIN base_order bo ON bo.id = mbo.id
                                INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id
                                CROSS JOIN JSON_TABLE(
                                    IF(JSON_VALID(moi.products) AND JSON_LENGTH(moi.products) > 0, moi.products, JSON_ARRAY()),
                                    '$[*]' COLUMNS (value JSON PATH '$')
                                ) prod
                                WHERE bo.creator_id = ?
                                  AND mbo.status IN (%s)
                                  AND UPPER(COALESCE(
                                      JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.qualityType.keyEnName')),
                                      JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.qualityType'))
                                  )) = 'HIDDEN'
                            )
                            """.formatted(PAID_STATUSES),
                    Integer.class,
                    userId
            );
            return found != null && found != 0;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private boolean anySeriesComplete(String userId) {
        try {
            Integer found = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*) FROM (
                                SELECT moi.mystery_box_id AS box_id
                                FROM mystery_box_order mbo
                                INNER JOIN base_order bo ON bo.id = mbo.id
                                INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id
                                CROSS JOIN JSON_TABLE(
                                    IF(JSON_VALID(moi.products) AND JSON_LENGTH(moi.products) > 0, moi.products, JSON_ARRAY()),
                                    '$[*]' COLUMNS (value JSON PATH '$')
                                ) prod
                                WHERE bo.creator_id = ?
                                  AND mbo.status IN (%s)
                                  AND moi.mystery_box_id IS NOT NULL
                                  AND JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.id')) IS NOT NULL
                                GROUP BY moi.mystery_box_id
                                HAVING COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.id'))) >= (
                                    SELECT COUNT(DISTINCT product_id)
                                    FROM mystery_box_product_rel r
                                    WHERE r.mystery_box_id = moi.mystery_box_id
                                )
                                AND (
                                    SELECT COUNT(DISTINCT product_id)
                                    FROM mystery_box_product_rel r
                                    WHERE r.mystery_box_id = moi.mystery_box_id
                                ) > 0
                            ) completed
                            """.formatted(PAID_STATUSES),
                    Integer.class,
                    userId
            );
            return found != null && found > 0;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    public static List<String> unlockedKeys(int openCount, boolean hasHidden, boolean seriesComplete) {
        List<String> unlocked = new java.util.ArrayList<>(List.of("classic", "asmr"));
        if (openCount >= 50) {
            unlocked.add("cyberpunk");
        }
        if (hasHidden) {
            unlocked.add("party");
        }
        if (seriesComplete) {
            unlocked.add("adventure");
        }
        return unlocked;
    }

    private record StoredProgress(int openCount, boolean hasHidden, boolean seriesComplete, String equippedThemeId) {
    }
}

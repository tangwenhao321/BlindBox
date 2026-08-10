package io.github.qifan777.server.box.order;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Resolves order ids through optional legacy mapping table (read-compat during migration). */
@Service
@RequiredArgsConstructor
public class OrderIdLookupService {

    private final JdbcTemplate jdbcTemplate;

    public String resolveCurrentId(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return orderId;
        }
        try {
            return jdbcTemplate.query(
                    """
                            SELECT current_id FROM order_id_legacy_map WHERE legacy_id = ? LIMIT 1
                            """,
                    rs -> rs.next() ? rs.getString("current_id") : orderId,
                    orderId.trim()
            );
        } catch (RuntimeException ignored) {
            return orderId;
        }
    }

    public record LegacyOrderAuditView(
            int totalOrders,
            int snowflakeOrders,
            int legacyOrders,
            int mappedLegacyOrders,
            List<String> sampleLegacyIds
    ) {
    }

    public LegacyOrderAuditView auditLegacyOrders(int sampleSize) {
        int total = queryInt("SELECT COUNT(*) FROM mystery_box_order");
        int snowflake = queryInt("""
                SELECT COUNT(*) FROM mystery_box_order
                WHERE id REGEXP '^[0-9]{10,20}$'
                """);
        int legacy = Math.max(total - snowflake, 0);
        int mapped = queryInt("SELECT COUNT(*) FROM order_id_legacy_map");
        int limit = Math.min(Math.max(sampleSize, 1), 50);
        List<String> samples = jdbcTemplate.query(
                """
                        SELECT id FROM mystery_box_order
                        WHERE id NOT REGEXP '^[0-9]{10,20}$'
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                limit
        );
        return new LegacyOrderAuditView(total, snowflake, legacy, mapped, samples);
    }

    @Transactional
    public int registerMapping(String legacyId, String currentId) {
        if (legacyId == null || legacyId.isBlank() || currentId == null || currentId.isBlank()) {
            throw new BusinessException("legacyId 与 currentId 不能为空");
        }
        if (legacyId.trim().equals(currentId.trim())) {
            throw new BusinessException("legacyId 与 currentId 不能相同");
        }
        return jdbcTemplate.update(
                """
                        INSERT INTO order_id_legacy_map (legacy_id, current_id)
                        VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE current_id = VALUES(current_id)
                        """,
                legacyId.trim(),
                currentId.trim()
        );
    }

    /**
     * Step 1 of migration: assign snowflake targets for legacy ids without rewriting order PKs.
     * Old links keep working via {@link #resolveCurrentId(String)} after step 2 rewrites PKs to current_id.
     */
    @Transactional
    public int prepareSnowflakeMappings(int batchSize) {
        int limit = Math.min(Math.max(batchSize, 1), 500);
        List<String> legacyIds = jdbcTemplate.query(
                """
                        SELECT mbo.id
                        FROM mystery_box_order mbo
                        LEFT JOIN order_id_legacy_map map ON map.legacy_id = mbo.id
                        WHERE mbo.id NOT REGEXP '^[0-9]{10,20}$'
                          AND map.legacy_id IS NULL
                        ORDER BY mbo.created_time ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                limit
        );
        int created = 0;
        for (String legacyId : legacyIds) {
            registerMapping(legacyId, OrderIds.next());
            created++;
        }
        return created;
    }

    public List<String> listPendingMigrationIds(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        return jdbcTemplate.query(
                """
                        SELECT map.legacy_id
                        FROM order_id_legacy_map map
                        INNER JOIN mystery_box_order mbo ON mbo.id = map.legacy_id
                        WHERE map.legacy_id <> map.current_id
                        ORDER BY map.migrated_time ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("legacy_id"),
                size
        );
    }

    private int queryInt(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }
}

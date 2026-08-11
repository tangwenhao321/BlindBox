package io.github.qifan777.server.box.order;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Step 2: rewrite order primary keys using order_id_legacy_map (admin only). */
@Service
@RequiredArgsConstructor
public class OrderIdMigrationService {

    private static final String CONFIRM_TOKEN = "REWRITE_ORDER_IDS";

    private final JdbcTemplate jdbcTemplate;
    private final OrderIdLookupService orderIdLookupService;

    public record TableImpact(String table, String column, int rows) {
    }

    public record PkRewritePlan(String legacyId, String currentId, List<TableImpact> impacts, int totalRows) {
    }

    public record PkRewriteResult(String legacyId, String currentId, int tablesUpdated, int rowsUpdated) {
    }

    public record MigrationLogEntry(
            long id,
            String legacyId,
            String currentId,
            int rowsUpdated,
            String operatorId,
            String createdTime
    ) {
    }

    public List<MigrationLogEntry> listMigrationLog(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        return jdbcTemplate.query(
                """
                        SELECT id, legacy_id, current_id, rows_updated, operator_id, created_time
                        FROM order_id_migration_log
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new MigrationLogEntry(
                        rs.getLong("id"),
                        rs.getString("legacy_id"),
                        rs.getString("current_id"),
                        rs.getInt("rows_updated"),
                        rs.getString("operator_id"),
                        rs.getTimestamp("created_time") == null
                                ? null
                                : rs.getTimestamp("created_time").toInstant().toString()
                ),
                size
        );
    }

    public List<PkRewritePlan> dryRunBatch(int batchSize) {
        int limit = Math.min(Math.max(batchSize, 1), 100);
        List<String> legacyIds = orderIdLookupService.listPendingMigrationIds(limit);
        List<PkRewritePlan> plans = new ArrayList<>(legacyIds.size());
        for (String legacyId : legacyIds) {
            plans.add(dryRunOne(legacyId));
        }
        return plans;
    }

    public PkRewritePlan dryRunOne(String legacyId) {
        Mapping mapping = requireMapping(legacyId);
        List<TableImpact> impacts = collectImpacts(mapping.legacyId());
        int total = impacts.stream().mapToInt(TableImpact::rows).sum();
        return new PkRewritePlan(mapping.legacyId(), mapping.currentId(), impacts, total);
    }

    @Transactional
    public PkRewriteResult applyOne(String legacyId, String confirmToken) {
        return applyOne(legacyId, confirmToken, null);
    }

    @Transactional
    public PkRewriteResult applyOne(String legacyId, String confirmToken, String operatorId) {
        assertConfirm(confirmToken);
        Mapping mapping = requireMapping(legacyId);
        if (mapping.legacyId().equals(mapping.currentId())) {
            throw new BusinessException("映射 legacy 与 current 相同，无需改写");
        }
        if (existsOrder(mapping.currentId())) {
            throw new BusinessException("目标订单 ID 已存在: " + mapping.currentId());
        }
        int rows = 0;
        rows += updateRef("marketplace_listing", "mystery_box_order_id", mapping);
        rows += updateRef("warehouse_ship_request_item", "order_id", mapping);
        rows += updateRef("mystery_box_draw_log", "mystery_box_order_id", mapping);
        rows += updateRef("refund_record", "order_id", mapping);
        rows += updateRef("mystery_box_order_item", "mystery_box_order_id", mapping);
        rows += updateRef("order_logistics_event", "order_id", mapping);
        rows += updateRef("community_post", "order_id", mapping);
        rows += updateRef("order_payment_retention_claim", "order_id", mapping);
        rows += updateRef("mystery_box_pool_slot", "order_id", mapping);
        rows += updateNotificationRef(mapping);
        rows += updateRef("referral_commission_record", "order_id", mapping);
        rows += jdbcTemplate.update("UPDATE payment SET id = ? WHERE id = ?", mapping.currentId(), mapping.legacyId());
        rows += jdbcTemplate.update("UPDATE base_order SET id = ? WHERE id = ?", mapping.currentId(), mapping.legacyId());
        rows += jdbcTemplate.update("UPDATE mystery_box_order SET id = ? WHERE id = ?", mapping.currentId(), mapping.legacyId());
        jdbcTemplate.update(
                "UPDATE order_id_legacy_map SET migrated_time = NOW(6) WHERE legacy_id = ?",
                mapping.legacyId()
        );
        PkRewriteResult result = new PkRewriteResult(mapping.legacyId(), mapping.currentId(), 13, rows);
        appendMigrationLog(result, operatorId);
        return result;
    }

    @Transactional
    public List<PkRewriteResult> applyBatch(int batchSize, String confirmToken) {
        return applyBatch(batchSize, confirmToken, null);
    }

    @Transactional
    public List<PkRewriteResult> applyBatch(int batchSize, String confirmToken, String operatorId) {
        assertConfirm(confirmToken);
        int limit = Math.min(Math.max(batchSize, 1), 50);
        List<String> legacyIds = orderIdLookupService.listPendingMigrationIds(limit);
        List<PkRewriteResult> results = new ArrayList<>(legacyIds.size());
        for (String legacyId : legacyIds) {
            results.add(applyOne(legacyId, confirmToken, operatorId));
        }
        return results;
    }

    public record MigrationPreflightView(
            boolean legacyMapTableReady,
            boolean migrationLogTableReady,
            boolean warehouseIndexesReady,
            boolean ready,
            List<String> missingObjects
    ) {
    }

    public MigrationPreflightView preflight() {
        List<String> missing = new ArrayList<>();
        boolean legacyMap = tableExists("order_id_legacy_map");
        if (!legacyMap) {
            missing.add("table:order_id_legacy_map (V20260550_01)");
        }
        boolean migrationLog = tableExists("order_id_migration_log");
        if (!migrationLog) {
            missing.add("table:order_id_migration_log (V20260552_01)");
        }
        boolean warehouseIndexes = indexExists("base_order", "idx_bo_creator_id")
                && indexExists("mystery_box_order_item", "idx_moi_order_id");
        if (!warehouseIndexes) {
            missing.add("index:idx_bo_creator_id / idx_moi_order_id (V20260551_02)");
        }
        return new MigrationPreflightView(legacyMap, migrationLog, warehouseIndexes, missing.isEmpty(), missing);
    }

    private boolean tableExists(String table) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM information_schema.TABLES
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                            """,
                    Integer.class,
                    table
            );
            return count != null && count > 0;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private boolean indexExists(String table, String index) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM information_schema.STATISTICS
                            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
                            """,
                    Integer.class,
                    table,
                    index
            );
            return count != null && count > 0;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private void appendMigrationLog(PkRewriteResult result, String operatorId) {
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO order_id_migration_log (legacy_id, current_id, rows_updated, operator_id)
                            VALUES (?, ?, ?, ?)
                            """,
                    result.legacyId(),
                    result.currentId(),
                    result.rowsUpdated(),
                    operatorId
            );
        } catch (RuntimeException ignored) {
            // Log table may not exist on older deployments until Flyway runs.
        }
    }

    private Mapping requireMapping(String legacyId) {
        if (legacyId == null || legacyId.isBlank()) {
            throw new BusinessException("legacyId 不能为空");
        }
        String trimmed = legacyId.trim();
        List<Mapping> rows = jdbcTemplate.query(
                """
                        SELECT legacy_id, current_id
                        FROM order_id_legacy_map
                        WHERE legacy_id = ?
                        LIMIT 1
                        """,
                (rs, rowNum) -> new Mapping(rs.getString("legacy_id"), rs.getString("current_id")),
                trimmed
        );
        if (rows.isEmpty()) {
            throw new BusinessException("未找到 legacy 映射: " + trimmed);
        }
        return rows.get(0);
    }

    private List<TableImpact> collectImpacts(String legacyId) {
        Map<String, String> refs = new LinkedHashMap<>();
        refs.put("marketplace_listing", "mystery_box_order_id");
        refs.put("warehouse_ship_request_item", "order_id");
        refs.put("mystery_box_draw_log", "mystery_box_order_id");
        refs.put("refund_record", "order_id");
        refs.put("mystery_box_order_item", "mystery_box_order_id");
        refs.put("order_logistics_event", "order_id");
        refs.put("community_post", "order_id");
        refs.put("order_payment_retention_claim", "order_id");
        refs.put("mystery_box_pool_slot", "order_id");
        refs.put("referral_commission_record", "order_id");
        refs.put("payment", "id");
        refs.put("base_order", "id");
        refs.put("mystery_box_order", "id");
        List<TableImpact> impacts = new ArrayList<>();
        for (Map.Entry<String, String> entry : refs.entrySet()) {
            int count = countRef(entry.getKey(), entry.getValue(), legacyId);
            if (count > 0) {
                impacts.add(new TableImpact(entry.getKey(), entry.getValue(), count));
            }
        }
        int notifications = countNotifications(legacyId);
        if (notifications > 0) {
            impacts.add(new TableImpact("user_notification", "ref_id", notifications));
        }
        return impacts;
    }

    private int countRef(String table, String column, String legacyId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + table + " WHERE " + column + " = ?",
                    Integer.class,
                    legacyId
            );
            return count == null ? 0 : count;
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private int countNotifications(String legacyId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*) FROM user_notification
                            WHERE ref_id = ?
                              AND category IN ('ORDER','PENDING_PAY','REFUND','WAREHOUSE_SHIP')
                            """,
                    Integer.class,
                    legacyId
            );
            return count == null ? 0 : count;
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private int updateRef(String table, String column, Mapping mapping) {
        try {
            return jdbcTemplate.update(
                    "UPDATE " + table + " SET " + column + " = ? WHERE " + column + " = ?",
                    mapping.currentId(),
                    mapping.legacyId()
            );
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private int updateNotificationRef(Mapping mapping) {
        try {
            return jdbcTemplate.update(
                    """
                            UPDATE user_notification
                            SET ref_id = ?
                            WHERE ref_id = ?
                              AND category IN ('ORDER','PENDING_PAY','REFUND','WAREHOUSE_SHIP')
                            """,
                    mapping.currentId(),
                    mapping.legacyId()
            );
        } catch (RuntimeException ignored) {
            return 0;
        }
    }

    private boolean existsOrder(String orderId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM mystery_box_order WHERE id = ?",
                Integer.class,
                orderId
        );
        return count != null && count > 0;
    }

    private static void assertConfirm(String confirmToken) {
        if (!CONFIRM_TOKEN.equals(confirmToken)) {
            throw new BusinessException("缺少确认令牌，请传 confirm=" + CONFIRM_TOKEN);
        }
    }

    private record Mapping(String legacyId, String currentId) {
    }
}

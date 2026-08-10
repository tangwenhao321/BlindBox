package io.github.qifan777.server.box.order;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderIdMigrationServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private OrderIdLookupService orderIdLookupService;

    private OrderIdMigrationService service;

    @BeforeEach
    void setUp() {
        service = new OrderIdMigrationService(jdbcTemplate, orderIdLookupService);
    }

    @Test
    void applyOne_requiresConfirmToken() {
        assertThrows(BusinessException.class, () -> service.applyOne("legacy-1", "WRONG"));
        verify(jdbcTemplate, never()).update(any(String.class), any(), any());
    }

    @Test
    void dryRunOne_requiresExistingMapping() {
        when(jdbcTemplate.query(contains("order_id_legacy_map"), any(RowMapper.class), eq("missing")))
                .thenReturn(List.of());

        assertThrows(BusinessException.class, () -> service.dryRunOne("missing"));
    }

    @Test
    void dryRunOne_summarizesImpacts() throws Exception {
        stubMapping("legacy-1", "890123456789012345");
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq("legacy-1")))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    if (sql.contains("mystery_box_order_item")) {
                        return 2;
                    }
                    if (sql.contains("FROM mystery_box_order WHERE")) {
                        return 1;
                    }
                    return 0;
                });

        OrderIdMigrationService.PkRewritePlan plan = service.dryRunOne("legacy-1");

        assertEquals("legacy-1", plan.legacyId());
        assertEquals("890123456789012345", plan.currentId());
        assertEquals(3, plan.totalRows());
        assertEquals(2, plan.impacts().size());
    }

    @Test
    void dryRunBatch_delegatesToPendingList() throws Exception {
        when(orderIdLookupService.listPendingMigrationIds(2)).thenReturn(List.of("legacy-a", "legacy-b"));
        stubMapping("legacy-a", "890123456789012341");
        stubMapping("legacy-b", "890123456789012342");
        when(jdbcTemplate.queryForObject(any(String.class), eq(Integer.class), any()))
                .thenReturn(0);
        when(jdbcTemplate.queryForObject(contains("mystery_box_order WHERE id"), eq(Integer.class), any()))
                .thenReturn(1);

        List<OrderIdMigrationService.PkRewritePlan> plans = service.dryRunBatch(2);

        assertEquals(2, plans.size());
        verify(orderIdLookupService).listPendingMigrationIds(2);
    }

    @Test
    void applyOne_rejectsWhenTargetOrderAlreadyExists() throws Exception {
        stubMapping("legacy-1", "890123456789012345");
        when(jdbcTemplate.queryForObject(contains("mystery_box_order WHERE id = ?"), eq(Integer.class), eq("890123456789012345")))
                .thenReturn(1);

        assertThrows(
                BusinessException.class,
                () -> service.applyOne("legacy-1", "REWRITE_ORDER_IDS")
        );
    }

    @Test
    void listMigrationLog_returnsEmptyWhenTableMissing() {
        when(jdbcTemplate.query(contains("order_id_migration_log"), any(RowMapper.class), eq(20)))
                .thenReturn(List.of());

        assertEquals(0, service.listMigrationLog(20).size());
    }

    @Test
    void preflight_readyWhenRequiredObjectsExist() {
        when(jdbcTemplate.queryForObject(contains("information_schema.TABLES"), eq(Integer.class), any()))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("information_schema.STATISTICS"), eq(Integer.class), any(), any()))
                .thenReturn(1);

        OrderIdMigrationService.MigrationPreflightView preflight = service.preflight();

        assertEquals(true, preflight.ready());
        assertEquals(true, preflight.legacyMapTableReady());
        assertEquals(true, preflight.migrationLogTableReady());
        assertEquals(true, preflight.warehouseIndexesReady());
    }

    private void stubMapping(String legacyId, String currentId) throws Exception {
        when(jdbcTemplate.query(contains("order_id_legacy_map"), any(RowMapper.class), eq(legacyId)))
                .thenAnswer(invocation -> {
                    RowMapper<?> mapper = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getString("legacy_id")).thenReturn(legacyId);
                    when(rs.getString("current_id")).thenReturn(currentId);
                    return List.of(mapper.mapRow(rs, 0));
                });
    }
}

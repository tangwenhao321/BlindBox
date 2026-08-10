package io.github.qifan777.server.box.order;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderIdLookupServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private OrderIdLookupService service;

    @BeforeEach
    void setUp() {
        service = new OrderIdLookupService(jdbcTemplate);
    }

    @Test
    void resolveCurrentId_returnsOriginalWhenBlank() {
        assertEquals(null, service.resolveCurrentId(null));
        assertEquals("  ", service.resolveCurrentId("  "));
    }

    @Test
    void resolveCurrentId_returnsMappedCurrentId() throws Exception {
        when(jdbcTemplate.query(contains("order_id_legacy_map"), any(ResultSetExtractor.class), eq("legacy-1")))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<String> extractor = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.next()).thenReturn(true);
                    when(rs.getString("current_id")).thenReturn("890123456789012345");
                    return extractor.extractData(rs);
                });

        assertEquals("890123456789012345", service.resolveCurrentId("legacy-1"));
    }

    @Test
    void resolveCurrentId_fallsBackToInputWhenUnmapped() throws Exception {
        when(jdbcTemplate.query(contains("order_id_legacy_map"), any(ResultSetExtractor.class), eq("legacy-2")))
                .thenAnswer(invocation -> {
                    ResultSetExtractor<String> extractor = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.next()).thenReturn(false);
                    return extractor.extractData(rs);
                });

        assertEquals("legacy-2", service.resolveCurrentId("legacy-2"));
    }

    @Test
    void registerMapping_rejectsBlankOrEqualIds() {
        assertThrows(BusinessException.class, () -> service.registerMapping("", "890123456789012345"));
        assertThrows(BusinessException.class, () -> service.registerMapping("legacy", ""));
        assertThrows(BusinessException.class, () -> service.registerMapping("same", "same"));
    }

    @Test
    void registerMapping_upsertsMappingRow() {
        when(jdbcTemplate.update(contains("order_id_legacy_map"), eq("legacy-a"), eq("890123456789012345")))
                .thenReturn(1);

        assertEquals(1, service.registerMapping("legacy-a", "890123456789012345"));
        verify(jdbcTemplate).update(contains("order_id_legacy_map"), eq("legacy-a"), eq("890123456789012345"));
    }

    @Test
    void auditLegacyOrders_buildsCountsAndSamples() {
        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM mystery_box_order", Integer.class)).thenReturn(120);
        when(jdbcTemplate.queryForObject(contains("REGEXP"), eq(Integer.class))).thenReturn(80);
        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_id_legacy_map", Integer.class)).thenReturn(15);
        when(jdbcTemplate.query(contains("ORDER BY created_time DESC"), any(RowMapper.class), eq(5)))
                .thenReturn(List.of("legacy-1", "legacy-2"));

        OrderIdLookupService.LegacyOrderAuditView audit = service.auditLegacyOrders(5);

        assertEquals(120, audit.totalOrders());
        assertEquals(80, audit.snowflakeOrders());
        assertEquals(40, audit.legacyOrders());
        assertEquals(15, audit.mappedLegacyOrders());
        assertEquals(List.of("legacy-1", "legacy-2"), audit.sampleLegacyIds());
    }

    @Test
    void listPendingMigrationIds_clampsLimit() {
        when(jdbcTemplate.query(contains("legacy_id <> map.current_id"), any(RowMapper.class), eq(50)))
                .thenReturn(List.of("legacy-pending"));

        assertEquals(List.of("legacy-pending"), service.listPendingMigrationIds(50));
    }
}

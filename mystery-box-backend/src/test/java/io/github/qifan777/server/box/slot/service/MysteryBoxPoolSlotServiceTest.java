package io.github.qifan777.server.box.slot.service;

import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MysteryBoxPoolSlotServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private MysteryBoxRepository mysteryBoxRepository;

    private MysteryBoxPoolSlotService service;

    @BeforeEach
    void setUp() {
        service = new MysteryBoxPoolSlotService(jdbcTemplate, mysteryBoxRepository);
    }

    @Test
    void reconcile_expiresReservationsAndReportsMismatches() {
        when(jdbcTemplate.update(contains("SET status = 'AVAILABLE'"))).thenReturn(2);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> List.of(
                new MysteryBoxPoolSlotService.PoolMismatch("box-1", 5, 3)
        ));

        MysteryBoxPoolSlotService.ReconcileResult result = service.reconcile();

        assertEquals(2, result.expiredReservations());
        assertEquals(1, result.mismatches().size());
        assertEquals("box-1", result.mismatches().get(0).mysteryBoxId());
        assertEquals(5, result.mismatches().get(0).poolRemaining());
        assertEquals(3, result.mismatches().get(0).openSlotCount());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sqlCaptor.capture());
        assertTrue(sqlCaptor.getValue().contains("reserved_until <= NOW(6)"));
    }

    @Test
    void reconcileAuditPayload_includesSampleMismatches() {
        MysteryBoxPoolSlotService.ReconcileResult result = new MysteryBoxPoolSlotService.ReconcileResult(
                1,
                List.of(new MysteryBoxPoolSlotService.PoolMismatch("box-2", 8, 6))
        );

        var payload = service.reconcileAuditPayload(result);

        assertEquals(1, payload.get("expiredReservations"));
        assertEquals(1, payload.get("mismatchCount"));
        assertTrue(payload.containsKey("sampleMismatches"));
    }
}

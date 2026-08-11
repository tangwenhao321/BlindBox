package io.github.qifan777.server.box.slot.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MysteryBoxPoolSlotService {
    private static final int MIN_SLOT_COUNT = 1;
    private static final int MAX_SLOT_COUNT = 200;
    private static final int RESERVE_SECONDS = 60;

    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxRepository mysteryBoxRepository;

    @Transactional(readOnly = false)
    public SlotGridView listSlots(String mysteryBoxId) {
        ensureSlotsInitialized(mysteryBoxId);
        MysteryBox mysteryBox = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int slotCount = resolveSlotCount(mysteryBox);
        List<SlotView> slots = jdbcTemplate.query(
                """
                        SELECT slot_no, status, reserved_by_user_id, reserved_until
                        FROM mystery_box_pool_slot
                        WHERE mystery_box_id = ?
                        ORDER BY slot_no ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new SlotView(
                        rs.getInt("slot_no"),
                        rs.getString("status"),
                        rs.getString("reserved_by_user_id"),
                        rs.getTimestamp("reserved_until") == null
                                ? null
                                : rs.getTimestamp("reserved_until").toLocalDateTime()
                ),
                mysteryBoxId,
                slotCount
        );
        return new SlotGridView(mysteryBoxId, slots);
    }

    @Transactional
    public SlotView reserve(String mysteryBoxId, int slotNo, String userId) {
        ensureSlotsInitialized(mysteryBoxId);
        if (slotNo <= 0) {
            throw new BusinessException("柜位编号无效");
        }
        releaseUserReservations(mysteryBoxId, userId);
        int updated = jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET status = 'RESERVED',
                            reserved_by_user_id = ?,
                            reserved_until = DATE_ADD(NOW(6), INTERVAL ? SECOND),
                            edited_time = NOW(6)
                        WHERE mystery_box_id = ?
                          AND slot_no = ?
                          AND status = 'AVAILABLE'
                        """,
                userId,
                RESERVE_SECONDS,
                mysteryBoxId,
                slotNo
        );
        if (updated == 0) {
            throw new BusinessException("该柜位不可选，请刷新后重试");
        }
        return requireSlot(mysteryBoxId, slotNo);
    }

    @Transactional
    public void release(String mysteryBoxId, String userId) {
        releaseUserReservations(mysteryBoxId, userId);
    }

    @Transactional
    public void releaseByOrder(String mysteryBoxId, int slotNo, String userId) {
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET status = 'AVAILABLE',
                            reserved_by_user_id = NULL,
                            reserved_until = NULL,
                            order_id = NULL,
                            edited_time = NOW(6)
                        WHERE mystery_box_id = ?
                          AND slot_no = ?
                          AND status = 'RESERVED'
                          AND reserved_by_user_id = ?
                        """,
                mysteryBoxId,
                slotNo,
                userId
        );
    }

    @Transactional
    public void bindOrder(String mysteryBoxId, int slotNo, String orderId) {
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET order_id = ?, edited_time = NOW(6)
                        WHERE mystery_box_id = ? AND slot_no = ?
                        """,
                orderId,
                mysteryBoxId,
                slotNo
        );
    }

    @Transactional
    public void markSold(String mysteryBoxId, int slotNo, String orderId, String userId) {
        int updated = jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET status = 'SOLD',
                            reserved_by_user_id = NULL,
                            reserved_until = NULL,
                            order_id = ?,
                            edited_time = NOW(6)
                        WHERE mystery_box_id = ?
                          AND slot_no = ?
                          AND status = 'RESERVED'
                          AND reserved_by_user_id = ?
                        """,
                orderId,
                mysteryBoxId,
                slotNo,
                userId
        );
        if (updated == 0) {
            throw new BusinessException("柜位状态异常，无法标记售出");
        }
    }

    public void assertReservedByUser(String mysteryBoxId, int slotNo, String userId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1)
                        FROM mystery_box_pool_slot
                        WHERE mystery_box_id = ?
                          AND slot_no = ?
                          AND status = 'RESERVED'
                          AND reserved_by_user_id = ?
                          AND (reserved_until IS NULL OR reserved_until > NOW(6))
                        """,
                Integer.class,
                mysteryBoxId,
                slotNo,
                userId
        );
        if (count == null || count == 0) {
            throw new BusinessException("柜位锁定已失效，请重新选盒");
        }
    }

    private SlotView requireSlot(String mysteryBoxId, int slotNo) {
        List<SlotView> slots = jdbcTemplate.query(
                """
                        SELECT slot_no, status, reserved_by_user_id, reserved_until
                        FROM mystery_box_pool_slot
                        WHERE mystery_box_id = ? AND slot_no = ?
                        """,
                (rs, rowNum) -> new SlotView(
                        rs.getInt("slot_no"),
                        rs.getString("status"),
                        rs.getString("reserved_by_user_id"),
                        rs.getTimestamp("reserved_until") == null
                                ? null
                                : rs.getTimestamp("reserved_until").toLocalDateTime()
                ),
                mysteryBoxId,
                slotNo
        );
        if (slots.isEmpty()) {
            throw new BusinessException("柜位不存在");
        }
        return slots.get(0);
    }

    private void releaseUserReservations(String mysteryBoxId, String userId) {
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET status = 'AVAILABLE',
                            reserved_by_user_id = NULL,
                            reserved_until = NULL,
                            order_id = NULL,
                            edited_time = NOW(6)
                        WHERE mystery_box_id = ?
                          AND reserved_by_user_id = ?
                          AND status = 'RESERVED'
                        """,
                mysteryBoxId,
                userId
        );
    }

    @Transactional
    public int expireAllStaleReservations() {
        return jdbcTemplate.update(
                """
                        UPDATE mystery_box_pool_slot
                        SET status = 'AVAILABLE',
                            reserved_by_user_id = NULL,
                            reserved_until = NULL,
                            order_id = NULL,
                            edited_time = NOW(6)
                        WHERE status = 'RESERVED'
                          AND reserved_until IS NOT NULL
                          AND reserved_until <= NOW(6)
                        """
        );
    }

    @Transactional
    public ReconcileResult reconcile() {
        int expiredReservations = expireAllStaleReservations();

        List<PoolMismatch> mismatches = jdbcTemplate.query(
                """
                        SELECT mb.id AS mystery_box_id,
                               mb.pool_remaining AS pool_remaining,
                               COUNT(CASE WHEN s.status IN ('AVAILABLE', 'RESERVED') THEN 1 END) AS open_slot_count
                        FROM mystery_box mb
                        LEFT JOIN mystery_box_pool_slot s ON s.mystery_box_id = mb.id
                        WHERE mb.pool_total > 0
                        GROUP BY mb.id, mb.pool_remaining
                        HAVING mb.pool_remaining <> COUNT(CASE WHEN s.status IN ('AVAILABLE', 'RESERVED') THEN 1 END)
                        LIMIT 200
                        """,
                (rs, rowNum) -> new PoolMismatch(
                        rs.getString("mystery_box_id"),
                        rs.getInt("pool_remaining"),
                        rs.getInt("open_slot_count")
                )
        );

        if (!mismatches.isEmpty()) {
            log.warn(
                    "pool slot reconciliation found {} mismatches sample={}",
                    mismatches.size(),
                    mismatches.stream().limit(5).toList()
            );
        } else {
            log.debug("pool slot reconciliation ok expiredReservations={}", expiredReservations);
        }

        return new ReconcileResult(expiredReservations, mismatches);
    }

    @Transactional
    public int repairMismatches(List<PoolMismatch> mismatches) {
        if (mismatches == null || mismatches.isEmpty()) {
            return 0;
        }
        // Do not auto-write pool_remaining — mismatches need manual ops review.
        log.warn(
                "pool slot repairMismatches disabled; refusing auto-write of pool_remaining count={} sample={}",
                mismatches.size(),
                mismatches.stream().limit(5).toList()
        );
        return 0;
    }

    public Map<String, Object> reconcileAuditPayload(ReconcileResult result) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("expiredReservations", result.expiredReservations());
        payload.put("mismatchCount", result.mismatches().size());
        if (!result.mismatches().isEmpty()) {
            payload.put(
                    "sampleMismatches",
                    result.mismatches().stream()
                            .limit(20)
                            .map(item -> Map.of(
                                    "mysteryBoxId", item.mysteryBoxId(),
                                    "poolRemaining", item.poolRemaining(),
                                    "openSlotCount", item.openSlotCount()
                            ))
                            .toList()
            );
        }
        return payload;
    }

    @Transactional
    public void ensureSlotsInitialized(String mysteryBoxId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_pool_slot WHERE mystery_box_id = ?",
                Integer.class,
                mysteryBoxId
        );
        if (count != null && count > 0) {
            return;
        }
        MysteryBox mysteryBox = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int slotCount = resolveSlotCount(mysteryBox);
        LocalDateTime now = LocalDateTime.now();
        List<Object[]> batch = new ArrayList<>(slotCount);
        for (int slotNo = 1; slotNo <= slotCount; slotNo++) {
            batch.add(new Object[]{
                    IdUtil.fastSimpleUUID(),
                    mysteryBoxId,
                    slotNo,
                    "AVAILABLE",
                    now,
                    now
            });
        }
        jdbcTemplate.batchUpdate(
                """
                        INSERT INTO mystery_box_pool_slot(
                            id, mystery_box_id, slot_no, status, created_time, edited_time
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
                batch
        );
    }

    /** Prefer poolTotal when set; otherwise poolRemaining; clamp to [1, 200]. */
    static int resolveSlotCount(MysteryBox mysteryBox) {
        int raw = mysteryBox.poolTotal() > 0 ? mysteryBox.poolTotal() : mysteryBox.poolRemaining();
        return Math.max(MIN_SLOT_COUNT, Math.min(MAX_SLOT_COUNT, raw));
    }

    public record SlotView(
            int slotNo,
            String status,
            String reservedByUserId,
            LocalDateTime reservedUntil
    ) {
    }

    public record SlotGridView(String mysteryBoxId, List<SlotView> slots) {
    }

    public record PoolMismatch(String mysteryBoxId, int poolRemaining, int openSlotCount) {
    }

    public record ReconcileResult(int expiredReservations, List<PoolMismatch> mismatches) {
        public ReconcileResult {
            mismatches = mismatches == null ? List.of() : List.copyOf(mismatches);
        }
    }
}

package io.github.qifan777.server.box.pack.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DrawPackConfigService {
    private final JdbcTemplate jdbcTemplate;

    public List<DrawPackConfigView> listEnabled() {
        return jdbcTemplate.query(
                """
                        SELECT id, draw_count, label, discount_rate, enabled, sort_order
                        FROM mystery_box_draw_pack_config
                        WHERE enabled = 1
                        ORDER BY sort_order ASC, draw_count ASC
                        """,
                (rs, rowNum) -> new DrawPackConfigView(
                        rs.getString("id"),
                        rs.getInt("draw_count"),
                        rs.getString("label"),
                        rs.getInt("discount_rate"),
                        rs.getBoolean("enabled"),
                        rs.getInt("sort_order")
                )
        );
    }

    public List<DrawPackConfigView> listAll() {
        return jdbcTemplate.query(
                """
                        SELECT id, draw_count, label, discount_rate, enabled, sort_order
                        FROM mystery_box_draw_pack_config
                        ORDER BY sort_order ASC, draw_count ASC
                        """,
                (rs, rowNum) -> new DrawPackConfigView(
                        rs.getString("id"),
                        rs.getInt("draw_count"),
                        rs.getString("label"),
                        rs.getInt("discount_rate"),
                        rs.getBoolean("enabled"),
                        rs.getInt("sort_order")
                )
        );
    }

    public Optional<DrawPackConfigView> findByDrawCount(int drawCount) {
        List<DrawPackConfigView> rows = jdbcTemplate.query(
                """
                        SELECT id, draw_count, label, discount_rate, enabled, sort_order
                        FROM mystery_box_draw_pack_config
                        WHERE draw_count = ? AND enabled = 1
                        LIMIT 1
                        """,
                (rs, rowNum) -> new DrawPackConfigView(
                        rs.getString("id"),
                        rs.getInt("draw_count"),
                        rs.getString("label"),
                        rs.getInt("discount_rate"),
                        rs.getBoolean("enabled"),
                        rs.getInt("sort_order")
                ),
                drawCount
        );
        return rows.stream().findFirst();
    }

    public BigDecimal applyBatchDiscount(BigDecimal unitPrice, int drawCount) {
        return findByDrawCount(drawCount)
                .map(config -> config.applyDiscount(unitPrice))
                .orElse(unitPrice.multiply(BigDecimal.valueOf(drawCount)));
    }

    public BigDecimal batchDiscountAmount(BigDecimal unitPrice, int drawCount) {
        BigDecimal original = unitPrice.multiply(BigDecimal.valueOf(drawCount));
        return original.subtract(applyBatchDiscount(unitPrice, drawCount));
    }

    @Transactional
    public DrawPackConfigView save(DrawPackConfigView input) {
        String id = input.id() == null || input.id().isBlank() ? IdUtil.fastSimpleUUID() : input.id();
        if (input.drawCount() < 1) {
            throw new BusinessException("连抽数量必须大于 0");
        }
        if (input.discountRate() < 1 || input.discountRate() > 10000) {
            throw new BusinessException("折扣率需在 1~10000 之间（万分比）");
        }
        jdbcTemplate.update(
                """
                        INSERT INTO mystery_box_draw_pack_config
                        (id, draw_count, label, discount_rate, enabled, sort_order, created_time, updated_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          draw_count = VALUES(draw_count),
                          label = VALUES(label),
                          discount_rate = VALUES(discount_rate),
                          enabled = VALUES(enabled),
                          sort_order = VALUES(sort_order),
                          updated_time = VALUES(updated_time)
                        """,
                id,
                input.drawCount(),
                input.label(),
                input.discountRate(),
                input.enabled() ? 1 : 0,
                input.sortOrder(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        return listAll().stream().filter(item -> item.id().equals(id)).findFirst()
                .orElseThrow(() -> new BusinessException("保存失败"));
    }

    @Transactional
    public void delete(String id) {
        jdbcTemplate.update("DELETE FROM mystery_box_draw_pack_config WHERE id = ?", id);
    }
}

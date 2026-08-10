package io.github.qifan777.server.box.pity.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MysteryBoxUserPityService {
    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxRepository mysteryBoxRepository;

    public PityProgressView progress(String userId, String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int threshold = box.pityThreshold() > 0 ? box.pityThreshold() : 50;
        int current = loadDrawsSinceHigh(userId, mysteryBoxId);
        int remaining = Math.max(threshold - current, 0);
        return new PityProgressView(current, threshold, remaining);
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

    private void increment(String userId, String mysteryBoxId, int delta) {
        if (delta <= 0) {
            return;
        }
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int threshold = box.pityThreshold() > 0 ? box.pityThreshold() : 50;
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM mystery_box_user_pity WHERE user_id = ? AND mystery_box_id = ?",
                Integer.class,
                userId,
                mysteryBoxId
        );
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE mystery_box_user_pity SET draws_since_high = draws_since_high + ?, edited_time = ? WHERE user_id = ? AND mystery_box_id = ?",
                    delta,
                    LocalDateTime.now(),
                    userId,
                    mysteryBoxId
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO mystery_box_user_pity (id, user_id, mystery_box_id, draws_since_high, pity_threshold, created_time, edited_time) VALUES (?,?,?,?,?,?,?)",
                    IdUtil.fastSimpleUUID(),
                    userId,
                    mysteryBoxId,
                    delta,
                    threshold,
                    LocalDateTime.now(),
                    LocalDateTime.now()
            );
        }
    }

    private void reset(String userId, String mysteryBoxId) {
        jdbcTemplate.update(
                "UPDATE mystery_box_user_pity SET draws_since_high = 0, edited_time = ? WHERE user_id = ? AND mystery_box_id = ?",
                LocalDateTime.now(),
                userId,
                mysteryBoxId
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

    public record PityProgressView(int current, int threshold, int remaining) {
    }
}

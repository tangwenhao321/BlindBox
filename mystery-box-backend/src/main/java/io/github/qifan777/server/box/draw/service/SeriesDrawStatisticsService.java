package io.github.qifan777.server.box.draw.service;

import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Public draw statistics for a mystery-box series (fairness UI).
 */
@Service
@RequiredArgsConstructor
public class SeriesDrawStatisticsService {
    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxRepository mysteryBoxRepository;

    public SeriesDrawStatisticsView statistics(String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        List<TierCountRow> rows = jdbcTemplate.query(
                """
                        SELECT quality_type, COUNT(1) AS cnt
                        FROM mystery_box_draw_log
                        WHERE mystery_box_id = ?
                        GROUP BY quality_type
                        """,
                (rs, rowNum) -> new TierCountRow(
                        normalizeTier(rs.getString("quality_type")),
                        rs.getInt("cnt")
                ),
                mysteryBoxId
        );
        Map<String, Integer> tierCounts = new LinkedHashMap<>();
        tierCounts.put("LEGENDARY", 0);
        tierCounts.put("HIDDEN", 0);
        tierCounts.put("GENERAL", 0);
        int totalDraws = 0;
        for (TierCountRow row : rows) {
            tierCounts.merge(row.qualityType(), row.count(), Integer::sum);
            totalDraws += row.count();
        }
        List<TierStat> tiers = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : tierCounts.entrySet()) {
            if (entry.getValue() <= 0 && totalDraws > 0) {
                continue;
            }
            double actualPercent = totalDraws <= 0 ? 0.0 : (entry.getValue() * 100.0) / totalDraws;
            tiers.add(new TierStat(entry.getKey(), entry.getValue(), roundPercent(actualPercent)));
        }
        return new SeriesDrawStatisticsView(
                mysteryBoxId,
                box.name(),
                totalDraws,
                box.legendaryRate(),
                box.hiddenRate(),
                box.generalRate(),
                tiers,
                LocalDateTime.now()
        );
    }

    private static String normalizeTier(String qualityType) {
        if (qualityType == null || qualityType.isBlank()) {
            return "GENERAL";
        }
        return switch (qualityType.toUpperCase()) {
            case "LEGENDARY", "LEGEND" -> "LEGENDARY";
            case "HIDDEN" -> "HIDDEN";
            default -> "GENERAL";
        };
    }

    private static double roundPercent(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record TierCountRow(String qualityType, int count) {
    }

    public record SeriesDrawStatisticsView(
            String mysteryBoxId,
            String mysteryBoxName,
            int totalDraws,
            int configuredLegendaryRate,
            int configuredHiddenRate,
            int configuredGeneralRate,
            List<TierStat> tiers,
            LocalDateTime asOf
    ) {
    }

    public record TierStat(String qualityType, int count, double actualPercent) {
    }
}

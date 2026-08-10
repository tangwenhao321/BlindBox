package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.model.PoolDashboardView;
import io.github.qifan777.server.box.root.model.PrizeStockLineView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PoolDashboardService {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final PrizeStockService prizeStockService;

    public PoolDashboardView dashboard(String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        List<PrizeStockLineView> lines = prizeStockService.listPrizeStock(mysteryBoxId);
        Map<String, int[]> tierMap = new LinkedHashMap<>();
        tierMap.put("LEGENDARY", new int[]{0, 0});
        tierMap.put("HIDDEN", new int[]{0, 0});
        tierMap.put("GENERAL", new int[]{0, 0});
        PoolDashboardView.LastOneInfo lastOne = null;
        for (PrizeStockLineView line : lines) {
            String tier = normalizeTier(line.qualityType());
            int[] acc = tierMap.computeIfAbsent(tier, k -> new int[]{0, 0});
            acc[0] += line.stockTotal();
            acc[1] += line.stockRemaining();
            if (line.lastOne()) {
                lastOne = new PoolDashboardView.LastOneInfo(
                        line.productId(),
                        line.productName(),
                        line.stockRemaining() > 0
                );
            }
        }
        List<PoolDashboardView.TierSummary> tiers = tierMap.entrySet().stream()
                .map(e -> new PoolDashboardView.TierSummary(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .filter(t -> t.total() > 0)
                .toList();
        int total = Math.max(box.poolTotal(), tiers.stream().mapToInt(PoolDashboardView.TierSummary::total).sum());
        int remaining = Math.max(box.poolRemaining(), tiers.stream().mapToInt(PoolDashboardView.TierSummary::remaining).sum());
        return new PoolDashboardView(total, remaining, tiers, lastOne, LocalDateTime.now());
    }

    private static String normalizeTier(String qualityType) {
        if (qualityType == null) {
            return "GENERAL";
        }
        return switch (qualityType.toUpperCase()) {
            case "LEGENDARY", "LEGEND" -> "LEGENDARY";
            case "HIDDEN" -> "HIDDEN";
            default -> "GENERAL";
        };
    }
}

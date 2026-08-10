package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.model.MysteryBoxInsightView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MysteryBoxInsightService {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxWinRuleService mysteryBoxWinRuleService;
    private final PrizeStockService prizeStockService;

    public MysteryBoxInsightView insight(String mysteryBoxId, String userId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        int total = Math.max(box.poolTotal(), 0);
        int remaining = Math.max(box.poolRemaining(), 0);
        if (total <= 0) {
            int fallback = Math.max((box.products() != null ? box.products().size() : 0) * 10, 100);
            total = fallback;
            remaining = fallback;
        }
        Integer designatedRemaining = null;
        String designatedHint = null;
        if (userId != null) {
            Optional<MysteryBoxWinRule> rule = mysteryBoxWinRuleService.findFirstActiveRule(userId, mysteryBoxId);
            if (rule.isPresent() && rule.get().remainingCount() > 0) {
                designatedRemaining = rule.get().remainingCount();
                designatedHint = "指定福利剩余 " + designatedRemaining + " 次（运营配置）";
            }
        }
        return new MysteryBoxInsightView(
                total,
                remaining,
                designatedRemaining,
                designatedHint,
                prizeStockService.listPrizeStock(mysteryBoxId)
        );
    }
}

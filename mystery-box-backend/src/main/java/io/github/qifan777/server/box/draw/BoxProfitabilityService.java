package io.github.qifan777.server.box.draw;

import io.github.qifan777.server.box.pack.model.DrawPackConfigView;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRel;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRelTable;
import io.github.qifan777.server.box.product.repository.MysteryBoxProductRelRepository;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.product.root.entity.Product;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Loads box context and runs {@link BoxExpectedValueGuard} across single-draw and pack scenarios.
 */
@Service
@RequiredArgsConstructor
public class BoxProfitabilityService {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxProductRelRepository mysteryBoxProductRelRepository;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final DrawPackConfigService drawPackConfigService;
    private final BoxExpectedValueGuard boxExpectedValueGuard;
    private final DynamicProbabilityAdjuster dynamicProbabilityAdjuster;
    private final PrizeExitValuationService prizeExitValuationService;

    public void assertBoxProfitable(String boxId) {
        MysteryBox box = mysteryBoxRepository.findById(boxId, MysteryBoxRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        assertBoxProfitable(box);
    }

    public void assertBoxProfitable(MysteryBox box) {
        List<Product> products = box.products() == null ? List.of() : new ArrayList<>(box.products());
        if (products.isEmpty()) {
            throw new BusinessException("盲盒至少需要一件奖品");
        }
        int pity = mysteryBoxUserPityService.resolveThreshold(box);
        List<DrawPackConfigView> packs = drawPackConfigService.listEnabled();
        prizeExitValuationService.applyToGuard();
        boxExpectedValueGuard.assertProfitable(
                box.price(),
                box.legendaryRate(),
                box.hiddenRate(),
                box.generalRate(),
                products,
                pity,
                packs,
                dynamicProbabilityAdjuster
        );
    }

    /** Recheck every box that includes this product (after price/COGS change). */
    public void recheckBoxesForProduct(String productId) {
        if (productId == null || productId.isBlank()) {
            return;
        }
        MysteryBoxProductRelTable t = MysteryBoxProductRelTable.$;
        List<String> boxIds = mysteryBoxProductRelRepository.sql().createQuery(t)
                .where(t.productId().eq(productId))
                .select(t.mysteryBoxId())
                .distinct()
                .execute();
        for (String boxId : boxIds) {
            assertBoxProfitable(boxId);
        }
    }

    /** After pack discount changes, revalidate all boxes against new pack math. */
    public void recheckAllBoxesForPackChange() {
        MysteryBoxTable t = MysteryBoxTable.$;
        List<String> boxIds = mysteryBoxRepository.sql().createQuery(t)
                .select(t.id())
                .execute();
        for (String boxId : boxIds) {
            assertBoxProfitable(boxId);
        }
    }

    public void recheckBoxForRel(MysteryBoxProductRel rel) {
        if (rel == null || rel.mysteryBoxId() == null) {
            return;
        }
        assertBoxProfitable(rel.mysteryBoxId());
    }
}

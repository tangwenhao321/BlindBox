package io.github.qifan777.server.box.product.service;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.RandomUtil;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLog;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLogDraft;
import io.github.qifan777.server.box.draw.repository.MysteryBoxDrawLogRepository;
import io.github.qifan777.server.box.draw.service.DrawFairnessService;
import io.github.qifan777.server.box.order.service.OrderDrawMetaService;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRel;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRelDraft;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRelFetcher;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRelTable;
import io.github.qifan777.server.box.product.repository.MysteryBoxProductRelRepository;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.model.PrizeStockLineView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.ProductFetcher;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.box.draw.cache.DrawPublicCacheInvalidator;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PrizeStockService {
    private static final int PROBABILITY_BASE = 10000;

    private final MysteryBoxProductRelRepository mysteryBoxProductRelRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final ProductRepository productRepository;
    private final MysteryBoxDrawLogRepository mysteryBoxDrawLogRepository;
    private final DrawPublicCacheInvalidator drawPublicCacheInvalidator;
    private final DrawFairnessService drawFairnessService;
    private final OrderDrawMetaService orderDrawMetaService;

    public List<PrizeStockLineView> listPrizeStock(String mysteryBoxId) {
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        return rels.stream()
                .sorted(Comparator.comparingInt(MysteryBoxProductRel::sortOrder))
                .map(this::toLine)
                .toList();
    }

    public void assertStockAvailable(String mysteryBoxId, int drawCount) {
        int available = loadRels(mysteryBoxId).stream().mapToInt(MysteryBoxProductRel::stockRemaining).sum();
        if (available < drawCount) {
            throw new BusinessException("奖池余量不足，剩余 " + available + " 张");
        }
    }

    @Transactional
    public List<ProductView> drawAndConsume(
            String userId,
            String mysteryBoxId,
            String orderId,
            int count,
            boolean forceHighTier
    ) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        Map<String, Product> productMap = productRepository.findByIds(
                rels.stream().map(MysteryBoxProductRel::productId).distinct().toList()
        ).stream().collect(Collectors.toMap(Product::id, p -> p));

        int legendaryRate = box.legendaryRate();
        int hiddenRate = box.hiddenRate();
        if (legendaryRate + hiddenRate + box.generalRate() != PROBABILITY_BASE) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "盲盒中奖概率配置错误");
        }

        List<Product> drawn = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            DictConstants.QualityType tier = forceHighTier && i == count - 1
                    ? pickHighTier(legendaryRate, hiddenRate)
                    : rollTierForStock(rels, productMap, legendaryRate, hiddenRate);
            Product picked = pickProduct(rels, productMap, tier);
            if (picked == null) {
                picked = pickProductWithTierFallback(rels, productMap, tier);
            }
            if (picked == null) {
                picked = pickAnyRemaining(rels, productMap);
            }
            if (picked == null) {
                throw new BusinessException("奖池已售罄");
            }
            consumeRelStock(rels, picked.id());
            drawn.add(picked);
        }

        boolean poolEmpty = rels.stream().mapToInt(MysteryBoxProductRel::stockRemaining).sum() == 0;
        Product lastOneProduct = null;
        if (poolEmpty) {
            lastOneProduct = grantLastOneIfPresent(rels, productMap).orElse(null);
            if (lastOneProduct != null) {
                drawn.add(lastOneProduct);
            }
        }

        int maxPrizes = count + (lastOneProduct != null ? 1 : 0);
        if (drawn.size() > maxPrizes) {
            log.warn("开奖数量超出约定，orderId={}, requested={}, actual={}, capped={}",
                    orderId, count, drawn.size(), maxPrizes);
            drawn = new ArrayList<>(drawn.subList(0, maxPrizes));
        }

        for (Product product : drawn) {
            boolean lastOne = lastOneProduct != null && product.id().equals(lastOneProduct.id());
            appendDrawLog(userId, mysteryBoxId, orderId, product, lastOne);
        }
        drawPublicCacheInvalidator.invalidateAfterDraw(mysteryBoxId);
        return drawn.stream().map(ProductView::new).toList();
    }

    private java.util.Optional<Product> grantLastOneIfPresent(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap
    ) {
        return rels.stream()
                .filter(MysteryBoxProductRel::lastOne)
                .filter(rel -> rel.stockRemaining() > 0)
                .findFirst()
                .map(rel -> {
                    Product product = productMap.get(rel.productId());
                    if (product == null) {
                        return null;
                    }
                    consumeRelStock(rels, product.id());
                    return product;
                })
                .filter(p -> p != null);
    }

    private void appendDrawLog(String userId, String mysteryBoxId, String orderId, Product product, boolean lastOne) {
        LocalDateTime createdTime = LocalDateTime.now();
        String seed = orderDrawMetaService.getFairnessSeed(orderId);
        if (seed == null || seed.isBlank()) {
            seed = IdUtil.fastSimpleUUID();
        }
        final String fairnessSeed = seed;
        final String fairnessHash = drawFairnessService.hash(
                fairnessSeed, userId, mysteryBoxId, orderId, product.id(), createdTime);
        MysteryBoxDrawLog entity = MysteryBoxDrawLogDraft.$.produce(draft -> draft
                .setId(IdUtil.fastSimpleUUID())
                .setUserId(userId)
                .setMysteryBoxId(mysteryBoxId)
                .setProductId(product.id())
                .setProductName(product.name())
                .setQualityType(product.qualityType().getKeyEnName())
                .setMysteryBoxOrderId(orderId)
                .setLastOne(lastOne)
                .setFairnessSeed(fairnessSeed)
                .setFairnessHash(fairnessHash)
                .setCreatedTime(createdTime));
        mysteryBoxDrawLogRepository.save(entity);
    }

    private boolean hasTierStock(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            DictConstants.QualityType tier
    ) {
        return rels.stream().anyMatch(rel -> {
            if (rel.stockRemaining() <= 0) {
                return false;
            }
            Product p = productMap.get(rel.productId());
            return p != null && tier.equals(p.qualityType());
        });
    }

    /**
     * Roll tier using only pools that still have stock.
     * Sold-out tiers are excluded; remaining tiers keep their relative weights (no dumping
     * the entire GENERAL pool onto HIDDEN when普通款售罄).
     */
    private DictConstants.QualityType rollTierForStock(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            int legendaryRate,
            int hiddenRate
    ) {
        int generalRate = PROBABILITY_BASE - legendaryRate - hiddenRate;
        int effectiveLegendary = hasTierStock(rels, productMap, DictConstants.QualityType.LEGENDARY)
                ? legendaryRate
                : 0;
        int effectiveHidden = hasTierStock(rels, productMap, DictConstants.QualityType.HIDDEN)
                ? hiddenRate
                : 0;
        int effectiveGeneral = hasTierStock(rels, productMap, DictConstants.QualityType.GENERAL)
                ? generalRate
                : 0;
        int total = effectiveLegendary + effectiveHidden + effectiveGeneral;
        if (total <= 0) {
            return DictConstants.QualityType.GENERAL;
        }
        int randomInt = RandomUtil.randomInt(0, total);
        if (randomInt < effectiveLegendary) {
            return DictConstants.QualityType.LEGENDARY;
        }
        if (randomInt < effectiveLegendary + effectiveHidden) {
            return DictConstants.QualityType.HIDDEN;
        }
        return DictConstants.QualityType.GENERAL;
    }

    private DictConstants.QualityType rollTier(int legendaryRate, int hiddenRate) {
        int randomInt = RandomUtil.randomInt(0, PROBABILITY_BASE);
        if (randomInt < legendaryRate) {
            return DictConstants.QualityType.LEGENDARY;
        }
        if (randomInt < legendaryRate + hiddenRate) {
            return DictConstants.QualityType.HIDDEN;
        }
        return DictConstants.QualityType.GENERAL;
    }

    private DictConstants.QualityType pickHighTier(int legendaryRate, int hiddenRate) {
        int highPool = legendaryRate + hiddenRate;
        if (highPool <= 0) {
            return DictConstants.QualityType.GENERAL;
        }
        int r = RandomUtil.randomInt(0, highPool);
        if (r < legendaryRate) {
            return DictConstants.QualityType.LEGENDARY;
        }
        return DictConstants.QualityType.HIDDEN;
    }

    private Product pickAnyRemaining(List<MysteryBoxProductRel> rels, Map<String, Product> productMap) {
        List<MysteryBoxProductRel> candidates = rels.stream()
                .filter(rel -> rel.stockRemaining() > 0)
                .toList();
        if (candidates.isEmpty()) {
            return null;
        }
        MysteryBoxProductRel rel = RandomUtil.randomEle(candidates);
        return productMap.get(rel.productId());
    }

    private Product pickProductWithTierFallback(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            DictConstants.QualityType tier
    ) {
        if (tier == DictConstants.QualityType.LEGENDARY) {
            Product legendary = pickProduct(rels, productMap, DictConstants.QualityType.LEGENDARY);
            if (legendary != null) {
                return legendary;
            }
            Product hidden = pickProduct(rels, productMap, DictConstants.QualityType.HIDDEN);
            if (hidden != null) {
                return hidden;
            }
        } else if (tier == DictConstants.QualityType.HIDDEN) {
            Product hidden = pickProduct(rels, productMap, DictConstants.QualityType.HIDDEN);
            if (hidden != null) {
                return hidden;
            }
        }
        Product general = pickProduct(rels, productMap, DictConstants.QualityType.GENERAL);
        if (general != null) {
            return general;
        }
        return pickAnyRemaining(rels, productMap);
    }

    private Product pickProduct(List<MysteryBoxProductRel> rels, Map<String, Product> productMap, DictConstants.QualityType tier) {
        List<MysteryBoxProductRel> candidates = rels.stream()
                .filter(rel -> rel.stockRemaining() > 0)
                .filter(rel -> {
                    Product p = productMap.get(rel.productId());
                    return p != null && tier.equals(p.qualityType());
                })
                .toList();
        if (candidates.isEmpty()) {
            return null;
        }
        MysteryBoxProductRel rel = RandomUtil.randomEle(candidates);
        return productMap.get(rel.productId());
    }

    private void consumeRelStock(List<MysteryBoxProductRel> rels, String productId) {
        MysteryBoxProductRelTable t = MysteryBoxProductRelTable.$;
        for (MysteryBoxProductRel rel : rels) {
            if (!rel.productId().equals(productId)) {
                continue;
            }
            int next = Math.max(rel.stockRemaining() - 1, 0);
            int updated = mysteryBoxProductRelRepository.sql().createUpdate(t)
                    .where(t.id().eq(rel.id()))
                    .where(t.stockRemaining().gt(0))
                    .set(t.stockRemaining(), next)
                    .execute();
            if (updated == 0) {
                throw new BusinessException("赏品库存不足或并发冲突，请重试");
            }
            rels.set(rels.indexOf(rel), MysteryBoxProductRelDraft.$.produce(rel, draft -> draft.setStockRemaining(next)));
            break;
        }
    }

    private List<MysteryBoxProductRel> loadRels(String mysteryBoxId) {
        MysteryBoxProductRelTable t = MysteryBoxProductRelTable.$;
        return mysteryBoxProductRelRepository.sql().createQuery(t)
                .where(t.mysteryBoxId().eq(mysteryBoxId))
                .select(t.fetch(MysteryBoxProductRelFetcher.$.allScalarFields().product(
                        ProductFetcher.$.name().qualityType())))
                .execute();
    }

    @Transactional
    public void rollbackByOrderId(String orderId) {
        List<MysteryBoxDrawLog> logs = mysteryBoxDrawLogRepository.findByOrderId(orderId);
        if (logs.isEmpty()) {
            return;
        }
        java.util.Map<String, Integer> poolRestore = new java.util.HashMap<>();
        for (MysteryBoxDrawLog log : logs) {
            restoreRelStock(log.mysteryBoxId(), log.productId());
            poolRestore.merge(log.mysteryBoxId(), 1, Integer::sum);
        }
        for (var entry : poolRestore.entrySet()) {
            mysteryBoxRepository.restorePool(entry.getKey(), entry.getValue());
        }
        drawPublicCacheInvalidator.invalidateAfterDraw(logs.get(0).mysteryBoxId());
    }

    private void restoreRelStock(String mysteryBoxId, String productId) {
        MysteryBoxProductRelTable t = MysteryBoxProductRelTable.$;
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        for (MysteryBoxProductRel rel : rels) {
            if (!rel.productId().equals(productId)) {
                continue;
            }
            int next = Math.min(rel.stockRemaining() + 1, rel.stockTotal());
            mysteryBoxProductRelRepository.sql().createUpdate(t)
                    .where(t.id().eq(rel.id()))
                    .set(t.stockRemaining(), next)
                    .execute();
            break;
        }
    }

    private PrizeStockLineView toLine(MysteryBoxProductRel rel) {
        Product product = rel.product();
        return new PrizeStockLineView(
                rel.id(),
                rel.productId(),
                product != null ? product.name() : "",
                product != null ? product.qualityType().getKeyEnName() : "",
                rel.stockTotal(),
                rel.stockRemaining(),
                rel.lastOne(),
                rel.stockRemaining() <= 0,
                rel.sortOrder()
        );
    }
}

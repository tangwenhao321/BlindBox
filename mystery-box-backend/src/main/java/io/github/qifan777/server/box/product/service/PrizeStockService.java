package io.github.qifan777.server.box.product.service;

import io.github.qifan777.server.dict.model.QualityType;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.draw.DrawRandom;
import io.github.qifan777.server.box.draw.DynamicProbabilityAdjuster;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLog;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLogDraft;
import io.github.qifan777.server.box.draw.repository.MysteryBoxDrawLogRepository;
import io.github.qifan777.server.box.draw.service.DrawFairnessService;
import io.github.qifan777.server.box.order.service.OrderDrawMetaService;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
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
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
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
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MysteryBoxProductRelRepository mysteryBoxProductRelRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final ProductRepository productRepository;
    private final MysteryBoxDrawLogRepository mysteryBoxDrawLogRepository;
    private final DrawPublicCacheInvalidator drawPublicCacheInvalidator;
    private final DrawFairnessService drawFairnessService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final DynamicProbabilityAdjuster dynamicProbabilityAdjuster;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final JdbcTemplate jdbcTemplate;
    /** Lazy: NewcomerBoxService depends on PrizeStockService. */
    private final ObjectProvider<NewcomerBoxService> newcomerBoxService;

    /** Free terminal prize when pool empties. Off by default — destroys margin. */
    @Value("${app.draw.last-one-enabled:false}")
    private boolean lastOneEnabled = false;

    public List<PrizeStockLineView> listPrizeStock(String mysteryBoxId) {
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        return rels.stream()
                .sorted(Comparator.comparingInt(MysteryBoxProductRel::sortOrder))
                .map(this::toLine)
                .toList();
    }

    public void assertStockAvailable(String mysteryBoxId, int drawCount) {
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        int available = rels.stream().mapToInt(MysteryBoxProductRel::stockRemaining).sum();
        if (available < drawCount) {
            throw new BusinessException("奖池余量不足，剩余 " + available + " 张");
        }
        assertGeneralPoolNotSoldOut(mysteryBoxId, rels);
    }

    /**
     * When published generalRate &gt; 0 but GENERAL stock is gone while high tiers remain,
     * stop selling so relative-weight renormalization cannot inflate high-tier odds.
     */
    private void assertGeneralPoolNotSoldOut(String mysteryBoxId, List<MysteryBoxProductRel> rels) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "盲盒不存在"));
        if (box.generalRate() <= 0) {
            return;
        }
        Map<String, Product> productMap = productRepository.findByIds(
                rels.stream().map(MysteryBoxProductRel::productId).distinct().toList()
        ).stream().collect(Collectors.toMap(Product::id, p -> p));
        boolean hasGeneral = hasTierStock(rels, productMap, QualityType.GENERAL);
        if (hasGeneral) {
            return;
        }
        boolean hasAny = rels.stream().anyMatch(r -> r.stockRemaining() > 0);
        if (hasAny) {
            throw new BusinessException(
                    "GENERAL_POOL_SOLD_OUT: 普通款已售罄，暂停开售以保持公示概率（请补货普通款或调整概率）");
        }
    }

    /** True when LEGENDARY or HIDDEN pool still has remaining units. */
    public boolean hasHighTierStock(String mysteryBoxId) {
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        Map<String, Product> productMap = productRepository.findByIds(
                rels.stream().map(MysteryBoxProductRel::productId).distinct().toList()
        ).stream().collect(Collectors.toMap(Product::id, p -> p));
        return hasTierStock(rels, productMap, QualityType.LEGENDARY)
                || hasTierStock(rels, productMap, QualityType.HIDDEN);
    }

    /**
     * Admin restock hook: when high-tier remaining increases, clear WAIT/PENDING compensate flags.
     */
    public void notifyStockIncreased(String mysteryBoxId, String productId, int beforeRemaining, int afterRemaining) {
        if (mysteryBoxId == null || afterRemaining <= beforeRemaining || afterRemaining <= 0) {
            return;
        }
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return;
        }
        QualityType q = product.qualityType();
        if (q != QualityType.LEGENDARY && q != QualityType.HIDDEN) {
            return;
        }
        if (hasHighTierStock(mysteryBoxId)) {
            mysteryBoxUserPityService.clearCompensateWaitOnRestock(mysteryBoxId);
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
        DrawRandom.bindSeed(orderDrawMetaService.getFairnessSeed(orderId));
        try {
            return drawAndConsumeBound(userId, mysteryBoxId, orderId, count, forceHighTier);
        } finally {
            DrawRandom.clearSeed();
        }
    }

    private List<ProductView> drawAndConsumeBound(
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

        int baseLegendary = box.legendaryRate();
        int baseHidden = box.hiddenRate();
        int baseGeneral = box.generalRate();
        if (baseLegendary + baseHidden + baseGeneral != PROBABILITY_BASE) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "盲盒中奖概率配置错误");
        }

        assertGeneralPoolNotSoldOut(mysteryBoxId, rels);

        int hour = LocalDateTime.now(VN_ZONE).getHour();
        NewcomerBoxService newcomer = newcomerBoxService.getIfAvailable();
        boolean suppressNewbie = newcomer != null
                && newcomer.qualifiesForNewcomerFirstDrawPrice(userId, box, count);
        DynamicProbabilityAdjuster.AdjustedRates adjusted = dynamicProbabilityAdjuster.adjust(
                baseLegendary,
                baseHidden,
                baseGeneral,
                new DynamicProbabilityAdjuster.AdjustContext(
                        mysteryBoxUserPityService.userDrawCountOnBox(userId, mysteryBoxId),
                        mysteryBoxUserPityService.loseStreak(userId, mysteryBoxId),
                        count,
                        hour,
                        suppressNewbie
                )
        );
        int legendaryRate = adjusted.legendaryRate();
        int hiddenRate = adjusted.hiddenRate();
        String configVersion = box.editedTime() == null ? null : box.editedTime().toString();
        String baseRatesJson = ratesJson(baseLegendary, baseHidden, baseGeneral);
        String adjustedRatesJson = ratesJson(legendaryRate, hiddenRate, adjusted.generalRate());

        if (forceHighTier) {
            boolean hasHigh = hasTierStock(rels, productMap, QualityType.LEGENDARY)
                    || hasTierStock(rels, productMap, QualityType.HIDDEN);
            if (!hasHigh) {
                // REQUIRES_NEW so PENDING survives the rollback of this draw transaction.
                mysteryBoxUserPityService.markCompensatePending(userId, mysteryBoxId);
                throw new BusinessException(
                        MoneyPathErrorCode.PITY_STOCK_EXHAUSTED,
                        MoneyPathErrorCode.PITY_STOCK_EXHAUSTED.tokenMessage()
                );
            }
        }

        List<Product> drawn = new ArrayList<>();
        List<QualityType> drawnTiers = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Product picked;
            if (forceHighTier && i == count - 1) {
                picked = pickForceHighProduct(rels, productMap, legendaryRate, hiddenRate);
                if (picked == null) {
                    mysteryBoxUserPityService.markCompensatePending(userId, mysteryBoxId);
                    throw new BusinessException(
                            MoneyPathErrorCode.PITY_STOCK_EXHAUSTED,
                            MoneyPathErrorCode.PITY_STOCK_EXHAUSTED.tokenMessage()
                    );
                }
            } else {
                QualityType tier = rollTierAbsoluteWithStock(
                        rels, productMap, legendaryRate, hiddenRate);
                picked = pickProduct(rels, productMap, tier);
                if (picked == null) {
                    picked = pickProductWithTierFallback(rels, productMap, tier);
                }
                if (picked == null) {
                    picked = pickAnyRemaining(rels, productMap);
                }
                if (picked == null) {
                    throw new BusinessException("奖池已售罄");
                }
            }
            consumeRelStock(rels, picked.id());
            drawn.add(picked);
            drawnTiers.add(picked.qualityType());
        }

        boolean poolEmpty = rels.stream().mapToInt(MysteryBoxProductRel::stockRemaining).sum() == 0;
        Product lastOneProduct = null;
        if (lastOneEnabled && poolEmpty) {
            lastOneProduct = grantLastOneIfPresent(rels, productMap).orElse(null);
            if (lastOneProduct != null) {
                drawn.add(lastOneProduct);
                drawnTiers.add(lastOneProduct.qualityType());
            }
        }

        int maxPrizes = count + (lastOneProduct != null ? 1 : 0);
        if (drawn.size() > maxPrizes) {
            log.warn("开奖数量超出约定，orderId={}, requested={}, actual={}, capped={}",
                    orderId, count, drawn.size(), maxPrizes);
            drawn = new ArrayList<>(drawn.subList(0, maxPrizes));
            drawnTiers = new ArrayList<>(drawnTiers.subList(0, maxPrizes));
        }

        for (int i = 0; i < drawn.size(); i++) {
            Product product = drawn.get(i);
            boolean lastOne = lastOneProduct != null && product.id().equals(lastOneProduct.id());
            appendDrawLog(userId, mysteryBoxId, orderId, product, lastOne);
            appendDrawAudit(
                    userId,
                    mysteryBoxId,
                    orderId,
                    baseRatesJson,
                    adjustedRatesJson,
                    configVersion,
                    product.id(),
                    drawnTiers.get(i) == null ? null : drawnTiers.get(i).getKeyEnName()
            );
        }
        drawPublicCacheInvalidator.invalidateAfterDraw(mysteryBoxId);
        return drawn.stream().map(ProductView::new).toList();
    }

    private void appendDrawAudit(
            String userId,
            String boxId,
            String orderId,
            String baseRates,
            String adjustedRates,
            String configVersion,
            String resultProductId,
            String resultTier
    ) {
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO draw_audit_log
                            (id, user_id, box_id, order_id, base_rates, adjusted_rates, config_version,
                             result_product_id, result_tier, created_time)
                            VALUES (?,?,?,?,?,?,?,?,?,?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    userId,
                    boxId,
                    orderId,
                    baseRates,
                    adjustedRates,
                    configVersion,
                    resultProductId,
                    resultTier,
                    LocalDateTime.now()
            );
        } catch (Exception ex) {
            log.warn("Failed to write draw_audit_log orderId={}: {}", orderId, ex.getMessage());
        }
    }

    private static String ratesJson(int legendary, int hidden, int general) {
        return "{\"legendary\":" + legendary + ",\"hidden\":" + hidden + ",\"general\":" + general + "}";
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
            throw new BusinessException("FAIRNESS_SEED_MISSING: 订单公平种子缺失，无法开奖");
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
            QualityType tier
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
     * Absolute-weight roll against PROBABILITY_BASE; re-roll when the hit tier is sold out.
     * Avoids renormalizing sold-out GENERAL mass onto high tiers (late-pool jackpot hunt).
     */
    private QualityType rollTierAbsoluteWithStock(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            int legendaryRate,
            int hiddenRate
    ) {
        for (int attempt = 0; attempt < 48; attempt++) {
            QualityType tier = rollTier(legendaryRate, hiddenRate);
            if (hasTierStock(rels, productMap, tier)) {
                return tier;
            }
        }
        // Exhausted retries: prefer any remaining tier without rewriting published odds mass.
        if (hasTierStock(rels, productMap, QualityType.GENERAL)) {
            return QualityType.GENERAL;
        }
        if (hasTierStock(rels, productMap, QualityType.HIDDEN)) {
            return QualityType.HIDDEN;
        }
        if (hasTierStock(rels, productMap, QualityType.LEGENDARY)) {
            return QualityType.LEGENDARY;
        }
        return QualityType.GENERAL;
    }

    private QualityType rollTier(int legendaryRate, int hiddenRate) {
        int randomInt = DrawRandom.nextInt(PROBABILITY_BASE);
        if (randomInt < legendaryRate) {
            return QualityType.LEGENDARY;
        }
        if (randomInt < legendaryRate + hiddenRate) {
            return QualityType.HIDDEN;
        }
        return QualityType.GENERAL;
    }

    /** Pity forceHigh: roll only among in-stock high tiers; never GENERAL while high stock exists. */
    private Product pickForceHighProduct(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            int legendaryRate,
            int hiddenRate
    ) {
        boolean hasL = hasTierStock(rels, productMap, QualityType.LEGENDARY);
        boolean hasH = hasTierStock(rels, productMap, QualityType.HIDDEN);
        if (!hasL && !hasH) {
            return null;
        }
        int effL = hasL ? Math.max(legendaryRate, 1) : 0;
        int effH = hasH ? Math.max(hiddenRate, 1) : 0;
        int pool = effL + effH;
        QualityType tier;
        if (pool <= 0) {
            tier = hasL ? QualityType.LEGENDARY : QualityType.HIDDEN;
        } else {
            int r = DrawRandom.nextInt(pool);
            tier = r < effL ? QualityType.LEGENDARY : QualityType.HIDDEN;
        }
        Product picked = pickProduct(rels, productMap, tier);
        if (picked != null) {
            return picked;
        }
        // Cross-fallback within high tiers only.
        if (tier == QualityType.LEGENDARY) {
            return pickProduct(rels, productMap, QualityType.HIDDEN);
        }
        return pickProduct(rels, productMap, QualityType.LEGENDARY);
    }

    private Product pickAnyRemaining(List<MysteryBoxProductRel> rels, Map<String, Product> productMap) {
        List<MysteryBoxProductRel> candidates = rels.stream()
                .filter(rel -> rel.stockRemaining() > 0)
                .toList();
        MysteryBoxProductRel rel = DrawRandom.pickOne(candidates);
        return rel == null ? null : productMap.get(rel.productId());
    }

    private Product pickProductWithTierFallback(
            List<MysteryBoxProductRel> rels,
            Map<String, Product> productMap,
            QualityType tier
    ) {
        if (tier == QualityType.LEGENDARY) {
            Product legendary = pickProduct(rels, productMap, QualityType.LEGENDARY);
            if (legendary != null) {
                return legendary;
            }
            Product hidden = pickProduct(rels, productMap, QualityType.HIDDEN);
            if (hidden != null) {
                return hidden;
            }
        } else if (tier == QualityType.HIDDEN) {
            Product hidden = pickProduct(rels, productMap, QualityType.HIDDEN);
            if (hidden != null) {
                return hidden;
            }
            // Symmetric high-tier fallback (was missing — caused pity forceHigh → GENERAL).
            Product legendary = pickProduct(rels, productMap, QualityType.LEGENDARY);
            if (legendary != null) {
                return legendary;
            }
        }
        Product general = pickProduct(rels, productMap, QualityType.GENERAL);
        if (general != null) {
            return general;
        }
        return pickAnyRemaining(rels, productMap);
    }

    private Product pickProduct(List<MysteryBoxProductRel> rels, Map<String, Product> productMap, QualityType tier) {
        List<MysteryBoxProductRel> candidates = rels.stream()
                .filter(rel -> rel.stockRemaining() > 0)
                .filter(rel -> {
                    Product p = productMap.get(rel.productId());
                    return p != null && tier.equals(p.qualityType());
                })
                .toList();
        MysteryBoxProductRel rel = DrawRandom.pickOne(candidates);
        return rel == null ? null : productMap.get(rel.productId());
    }

    /**
     * Designated-win stock swap: restore the rolled SKU and consume the designated SKU.
     * Call before pity recording so progress matches the final prize.
     */
    @Transactional
    public List<ProductView> swapDesignatedPrize(
            String mysteryBoxId,
            List<ProductView> drawn,
            String designatedProductId
    ) {
        if (drawn == null || drawn.isEmpty() || designatedProductId == null || designatedProductId.isBlank()) {
            return drawn;
        }
        String originalId = drawn.get(0).getId();
        if (designatedProductId.equals(originalId)) {
            return drawn;
        }
        Product designated = productRepository.findById(designatedProductId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "指定中奖商品不存在"));
        restoreRelStock(mysteryBoxId, originalId);
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        consumeRelStock(rels, designatedProductId);
        List<ProductView> mutable = new ArrayList<>(drawn);
        mutable.set(0, new ProductView(designated));
        return mutable;
    }

    private void consumeRelStock(List<MysteryBoxProductRel> rels, String productId) {
        MysteryBoxProductRelTable t = MysteryBoxProductRelTable.$;
        for (MysteryBoxProductRel rel : rels) {
            if (!rel.productId().equals(productId)) {
                continue;
            }
            // Atomic decrement: SET stock_remaining = stock_remaining - 1 WHERE remaining > 0
            int updated = mysteryBoxProductRelRepository.sql().createUpdate(t)
                    .where(t.id().eq(rel.id()))
                    .where(t.stockRemaining().gt(0))
                    .set(t.stockRemaining(), t.stockRemaining().minus(1))
                    .execute();
            if (updated == 0) {
                throw new BusinessException(
                        MoneyPathErrorCode.STOCK_CONFLICT,
                        MoneyPathErrorCode.STOCK_CONFLICT.tokenMessage()
                );
            }
            int next = rel.stockRemaining() - 1;
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
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        // Idempotency: only the first successful claim restores stock.
        try {
            int claimed = jdbcTemplate.update(
                    "INSERT INTO order_stock_rollback (order_id, created_time) VALUES (?, ?)",
                    orderId,
                    LocalDateTime.now()
            );
            if (claimed == 0) {
                return;
            }
        } catch (org.springframework.dao.DuplicateKeyException dup) {
            log.info("Stock rollback already applied orderId={}", orderId);
            return;
        }
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
        List<MysteryBoxProductRel> rels = loadRels(mysteryBoxId);
        for (MysteryBoxProductRel rel : rels) {
            if (!rel.productId().equals(productId)) {
                continue;
            }
            jdbcTemplate.update(
                    """
                            UPDATE mystery_box_product_rel
                            SET stock_remaining = LEAST(stock_remaining + 1, stock_total)
                            WHERE id = ?
                            """,
                    rel.id()
            );
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

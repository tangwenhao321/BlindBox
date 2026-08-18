package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Draw / win-rule logic for paid orders. Intentionally has NO {@code @Transactional}:
 * must join the outer payment-notify transaction so pity-stock failures roll back with claimPaid.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MysteryBoxOrderDrawService {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final PrizeStockService prizeStockService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final MysteryBoxWinRuleService mysteryBoxWinRuleService;
    private final ProductRepository productRepository;

    @Value("${app.fairness.allow-win-rule-override:false}")
    private boolean allowWinRuleOverride;

    /**
     * Pool consume + prize draw + win-rule + pity streak + mode cleanup for a claimed paid order.
     */
    public void drawPaidOrderItems(MysteryBoxOrder mysteryBoxOrder) {
        boolean poolAlreadyReserved = orderDrawMetaService.isPoolReserved(mysteryBoxOrder.id());
        mysteryBoxOrder.items().forEach(mysteryBoxOrderItem -> {
            if (!poolAlreadyReserved) {
                // Legacy orders created before create-time reserve.
                mysteryBoxRepository.consumePool(
                        mysteryBoxOrderItem.mysteryBoxId(),
                        mysteryBoxOrderItem.mysteryBoxCount()
                );
            }
            boolean forceHigh = mysteryBoxUserPityService.shouldForceHigh(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    mysteryBoxOrderItem.mysteryBoxCount()
            );
            List<ProductView> generateProducts = prizeStockService.drawAndConsume(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    mysteryBoxOrder.id(),
                    mysteryBoxOrderItem.mysteryBoxCount(),
                    forceHigh
            );
            int paidCount = mysteryBoxOrderItem.mysteryBoxCount();
            generateProducts = applyWinRuleIfPresent(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrder.id(),
                    mysteryBoxOrderItem.id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    generateProducts
            );
            // Pity ignores free lastOne (appended after paidCount) so terminal prize does not reset/inflate streaks.
            List<ProductView> pitySlice = generateProducts.size() > paidCount
                    ? generateProducts.subList(0, paidCount)
                    : generateProducts;
            mysteryBoxUserPityService.recordDrawResults(
                    mysteryBoxOrder.creator().id(),
                    mysteryBoxOrderItem.mysteryBoxId(),
                    pitySlice
            );
            String drawMode = orderDrawMetaService.getDrawMode(mysteryBoxOrder.id());
            if ("buyout".equalsIgnoreCase(drawMode)) {
                mysteryBoxDrawQueueService.releaseBuyoutLock(mysteryBoxOrderItem.mysteryBoxId(), mysteryBoxOrder.creator().id());
            }
            if ("queue".equalsIgnoreCase(drawMode)) {
                mysteryBoxDrawQueueService.leaveQueueForUser(
                        mysteryBoxOrderItem.mysteryBoxId(),
                        mysteryBoxOrder.creator().id()
                );
            }
            if ("cabinet".equalsIgnoreCase(drawMode)) {
                Integer slotNo = orderDrawMetaService.getSlotNo(mysteryBoxOrder.id());
                if (slotNo != null) {
                    mysteryBoxPoolSlotService.markSold(
                            mysteryBoxOrderItem.mysteryBoxId(),
                            slotNo,
                            mysteryBoxOrder.id(),
                            mysteryBoxOrder.creator().id()
                    );
                }
            }
            mysteryBoxOrderItemRepository.updateProducts(mysteryBoxOrderItem.id(), generateProducts);
        });
        // Pool units were consumed at create; after successful draw they are final — do not restore on cancel.
        orderDrawMetaService.clearPoolReserved(mysteryBoxOrder.id());
    }

    List<ProductView> applyWinRuleIfPresent(String userId,
                                            String mysteryBoxOrderId,
                                            String mysteryBoxOrderItemId,
                                            String mysteryBoxId,
                                            List<ProductView> generatedProducts) {
        Optional<MysteryBoxWinRule> matchedRule = mysteryBoxWinRuleService.findFirstActiveRule(userId, mysteryBoxId);
        if (matchedRule.isEmpty()) {
            return generatedProducts;
        }
        if (!allowWinRuleOverride) {
            log.info(
                    "Win-rule overwrite skipped (app.fairness.allow-win-rule-override=false): ruleId={}, userId={}, mysteryBoxId={}",
                    matchedRule.get().id(),
                    userId,
                    mysteryBoxId
            );
            return generatedProducts;
        }
        MysteryBoxWinRule rule = matchedRule.get();
        Product designatedProduct = productRepository.findById(rule.productId())
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "指定中奖商品不存在"));
        String originalProductId = generatedProducts.isEmpty() ? "" : generatedProducts.get(0).getId();
        List<ProductView> mutable = prizeStockService.swapDesignatedPrize(
                mysteryBoxId,
                generatedProducts,
                designatedProduct.id()
        );
        if (!mysteryBoxWinRuleService.consumeOneAtomic(rule)) {
            // Race: restore by reversing swap if consume failed
            if (!originalProductId.isBlank() && !originalProductId.equals(designatedProduct.id())) {
                prizeStockService.swapDesignatedPrize(mysteryBoxId, mutable, originalProductId);
            }
            log.warn("Win-rule consume raced out: ruleId={}, orderId={}", rule.id(), mysteryBoxOrderId);
            return generatedProducts;
        }
        mysteryBoxWinRuleService.recordHit(
                rule.id(),
                userId,
                mysteryBoxOrderId,
                mysteryBoxOrderItemId,
                mysteryBoxId,
                originalProductId,
                designatedProduct.id(),
                rule.remark()
        );
        return mutable;
    }
}

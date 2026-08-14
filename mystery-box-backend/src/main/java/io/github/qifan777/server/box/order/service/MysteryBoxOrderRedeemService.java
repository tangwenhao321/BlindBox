package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

/**
 * Order-level redeem-to-balance (all prizes on an order).
 * Per-item redeem remains in {@link MysteryBoxOrderItemRedeemService}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderRedeemService {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final RedeemProperties redeemProperties;
    private final MarketProperties marketProperties;
    private final UserWalletService userWalletService;
    private final UserComplianceService userComplianceService;

    @Transactional
    public BigDecimal redeemToBalance(String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(id);
        checkOwner(order);
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        checkStatus(order, ProductOrderStatus.TO_BE_DELIVERED, ProductOrderStatus.TO_BE_RECEIVED);
        BigDecimal payCap = order.baseOrder().payment().payAmount();
        if (payCap == null || payCap.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("订单金额异常，无法兑换"));
        }
        BigDecimal recoveryTotal = BigDecimal.ZERO;
        for (var line : order.items()) {
            MysteryBoxOrderItem locked = mysteryBoxOrderItemRepository.findByIdWithProductsForUpdate(line.id())
                    .orElse(null);
            if (locked == null) {
                continue;
            }
            List<ProductView> products = locked.products();
            if (products == null || products.isEmpty()) {
                continue;
            }
            for (ProductView product : products) {
                if (product == null) {
                    continue;
                }
                recoveryTotal = recoveryTotal.add(
                        redeemProperties.recoveryAmount(product.getPrice(), marketProperties.getCurrency()));
            }
            mysteryBoxOrderItemRepository.updateProducts(line.id(), List.of());
        }
        BigDecimal amount = recoveryTotal.min(payCap);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("订单金额异常，无法兑换"));
        }
        userWalletService.credit(
                order.creator().id(),
                amount,
                "REDEEM_ORDER",
                "盲盒奖品兑换余额",
                id
        );
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.FINISHED);
        return amount;
    }

    private void checkStatus(MysteryBoxOrder mysteryBoxOrder, ProductOrderStatus... productOrderStatusList) {
        for (var status : productOrderStatusList) {
            if (mysteryBoxOrder.status().equals(status)) {
                return;
            }
        }
        throw new BusinessException(ResultCode.ParamSetIllegal, "订单状态不正确");
    }

    private void checkOwner(MysteryBoxOrder mysteryBoxOrder) {
        if (!mysteryBoxOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("非本人操作"));
        }
    }
}

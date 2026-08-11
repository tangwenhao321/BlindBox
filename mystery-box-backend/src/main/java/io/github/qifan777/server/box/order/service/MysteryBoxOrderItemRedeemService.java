package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

@Service
@RequiredArgsConstructor
public class MysteryBoxOrderItemRedeemService {
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final UserWalletService userWalletService;
    private final RedeemProperties redeemProperties;
    private final MarketProperties marketProperties;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public BigDecimal redeemItemToBalance(String userId, String itemId, String productId) {
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findByIdWithProducts(itemId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单项不存在"));
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(item.mysteryBoxOrderId());
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("无权操作该订单"));
        }
        if (!ProductOrderStatus.TO_BE_DELIVERED.equals(order.status())
                && !ProductOrderStatus.TO_BE_RECEIVED.equals(order.status())) {
            throw new BusinessException("当前订单状态不可兑换");
        }
        BigDecimal payCap = order.baseOrder().payment().payAmount();
        if (payCap == null || payCap.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("订单金额异常，无法兑换"));
        }
        List<ProductView> stored = item.products();
        if (stored == null || stored.isEmpty()) {
            throw new BusinessException("奖品不存在或已兑换");
        }
        List<ProductView> products = new ArrayList<>(stored);
        ProductView target = products.stream()
                .filter(p -> p != null && p.getId() != null && productId.equals(p.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("奖品不存在或已兑换"));
        BigDecimal already = sumAlreadyRedeemed(userId, order);
        BigDecimal remainingCap = payCap.subtract(already).max(BigDecimal.ZERO);
        BigDecimal amount = redeemProperties.recoveryAmount(target.getPrice(), marketProperties.getCurrency())
                .min(remainingCap);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    MoneyPathErrorCode.PAYMENT_AMOUNT_MISMATCH.tokenMessage("已达实付兑换上限"));
        }
        products.remove(target);
        mysteryBoxOrderItemRepository.updateProducts(itemId, products);
        // ref = item:product so multiple prizes on one order remain distinct for ledger idempotency
        userWalletService.credit(
                userId,
                amount,
                "REDEEM_ITEM",
                "单件奖品兑换余额：" + target.getName(),
                itemId + ":" + productId
        );
        return amount;
    }

    private BigDecimal sumAlreadyRedeemed(String userId, MysteryBoxOrder order) {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal orderRedeem = jdbcTemplate.query(
                """
                        SELECT COALESCE(SUM(amount), 0) AS s FROM user_balance_log
                        WHERE user_id = ? AND change_type = 'REDEEM_ORDER' AND related_order_id = ?
                        """,
                rs -> rs.next() ? rs.getBigDecimal("s") : BigDecimal.ZERO,
                userId,
                order.id()
        );
        if (orderRedeem != null) {
            total = total.add(orderRedeem);
        }
        if (order.items() != null) {
            for (var line : order.items()) {
                if (line == null || line.id() == null) {
                    continue;
                }
                BigDecimal itemSum = jdbcTemplate.query(
                        """
                                SELECT COALESCE(SUM(amount), 0) AS s FROM user_balance_log
                                WHERE user_id = ? AND change_type = 'REDEEM_ITEM'
                                  AND related_order_id LIKE CONCAT(?, ':%')
                                """,
                        rs -> rs.next() ? rs.getBigDecimal("s") : BigDecimal.ZERO,
                        userId,
                        line.id()
                );
                if (itemSum != null) {
                    total = total.add(itemSum);
                }
            }
        }
        return total.max(BigDecimal.ZERO);
    }
}

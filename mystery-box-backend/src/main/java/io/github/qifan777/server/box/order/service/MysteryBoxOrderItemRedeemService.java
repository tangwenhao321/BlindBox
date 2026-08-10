package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogDraft;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
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
    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;
    private final RedeemProperties redeemProperties;

    @Transactional
    public BigDecimal redeemItemToBalance(String userId, String itemId, String productId) {
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findByIdWithProducts(itemId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单项不存在"));
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(item.mysteryBoxOrderId());
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException("无权操作该订单");
        }
        if (!ProductOrderStatus.TO_BE_DELIVERED.equals(order.status())
                && !ProductOrderStatus.TO_BE_RECEIVED.equals(order.status())) {
            throw new BusinessException("当前订单状态不可兑换");
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
        BigDecimal amount = redeemProperties.recoveryAmount(target.getPrice());
        products.remove(target);
        mysteryBoxOrderItemRepository.updateProducts(itemId, products);
        userRepository.addBalance(userId, amount);
        BigDecimal latestBalance = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"))
                .balance();
        userBalanceLogRepository.save(UserBalanceLogDraft.$.produce(draft -> draft
                .setUserId(userId)
                .setChangeType("REDEEM_ITEM")
                .setAmount(amount)
                .setBalanceAfter(latestBalance)
                .setRelatedOrderId(order.id())
                .setRemark("单件奖品兑换余额：" + target.getName())));
        return amount;
    }
}

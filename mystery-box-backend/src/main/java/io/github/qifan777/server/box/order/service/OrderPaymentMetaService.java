package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.model.OrderPaymentMetaView;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OrderPaymentMetaService {
    private static final int PAY_MINUTES = 15;

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxDrawQueueService drawQueueService;
    private final PaymentRetentionService paymentRetentionService;

    public OrderPaymentMetaView meta(String orderId) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        String userId = StpUtil.getLoginIdAsString();
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException("无权查看订单");
        }
        LocalDateTime created = order.createdTime() == null ? LocalDateTime.now() : order.createdTime();
        LocalDateTime deadline = created.plusMinutes(PAY_MINUTES);
        Integer lockSeconds = null;
        if (order.items() != null && !order.items().isEmpty()) {
            String boxId = order.items().get(0).mysteryBoxId();
            var lock = drawQueueService.buyoutLockStatus(boxId);
            if (lock.holderUserId() != null && lock.holderUserId().equals(userId)) {
                lockSeconds = lock.lockTtlSeconds();
            }
        }
        PaymentRetentionService.Eligibility eligibility =
                paymentRetentionService.evaluateEligibility(orderId, userId, order);
        BigDecimal discount = eligibility.claimed()
                ? eligibility.claimedDiscount()
                : eligibility.offerDiscount();
        BigDecimal payAmount = order.baseOrder().payment().payAmount();
        return new OrderPaymentMetaView(
                orderId,
                deadline,
                lockSeconds,
                eligibility.claimed(),
                discount,
                eligibility.eligible(),
                eligibility.blockReason(),
                payAmount
        );
    }

    public LocalDateTime payDeadlineFor(MysteryBoxOrder order) {
        LocalDateTime created = order.createdTime() == null ? LocalDateTime.now() : order.createdTime();
        return created.plusMinutes(PAY_MINUTES);
    }

    public boolean isUnpaid(MysteryBoxOrder order) {
        return ProductOrderStatus.TO_BE_PAID.equals(order.status());
    }
}

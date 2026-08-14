package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static io.github.qifan777.server.dict.model.DictConstants.CouponUseStatus;
import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

/**
 * Unpaid cancel / pool-slot release flows extracted from {@link MysteryBoxOrderService}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderCancelService {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    private final OrderDrawMetaService orderDrawMetaService;
    private final CouponService couponService;

    /**
     * 用户在移动端取消未支付的订单
     * @param id 订单id
     * @return 订单id
     */
    @Transactional
    public String unpaidCancelForUser(String id) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_PAID);
        checkOwner(mysteryBoxOrder);
        mysteryBoxOrderRepository.changeStatus(mysteryBoxOrder.id(), ProductOrderStatus.CLOSED);
        // 优惠券设置为未使用
        if (mysteryBoxOrder.baseOrder().couponUser() != null) {
            couponService.changeStatus(mysteryBoxOrder.baseOrder().couponUser().id(), CouponUseStatus.UNUSED);
        }
        releaseCabinetSlotIfNeeded(mysteryBoxOrder.id());
        releasePoolReservationIfNeeded(mysteryBoxOrder);
        return mysteryBoxOrder.id();
    }

    /** Restore pool units held at create when the order never reached a successful draw. */
    void releasePoolReservationIfNeeded(MysteryBoxOrder order) {
        if (order == null || !orderDrawMetaService.isPoolReserved(order.id())) {
            return;
        }
        if (order.items() != null) {
            for (var item : order.items()) {
                mysteryBoxRepository.restorePool(item.mysteryBoxId(), item.mysteryBoxCount());
            }
        }
        orderDrawMetaService.clearPoolReserved(order.id());
    }

    void releaseCabinetSlotIfNeeded(String orderId) {
        String drawMode = orderDrawMetaService.getDrawMode(orderId);
        if (!"cabinet".equalsIgnoreCase(drawMode)) {
            return;
        }
        Integer slotNo = orderDrawMetaService.getSlotNo(orderId);
        if (slotNo == null) {
            return;
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (order.items().isEmpty()) {
            return;
        }
        mysteryBoxPoolSlotService.releaseByOrder(
                order.items().get(0).mysteryBoxId(),
                slotNo,
                order.creator().id()
        );
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

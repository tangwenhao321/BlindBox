package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.order.repository.BaseOrderRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderLogisticsService {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final BaseOrderRepository baseOrderRepository;
    private final OrderLogisticsService orderLogisticsService;
    private final UserNotificationService userNotificationService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * 管理员在后台发货
     * @param id 订单id
     * @param trackingNumber 物流单号
     * @return 订单id
     */
    @Transactional
    public String deliver(String id, String trackingNumber) {
        return deliver(id, trackingNumber, "auto");
    }

    @Transactional
    public String deliver(String id, String trackingNumber, String carrierCode) {
        MysteryBoxOrder mysteryBoxOrder = mysteryBoxOrderRepository.findByIdForFront(id);
        checkStatus(mysteryBoxOrder, ProductOrderStatus.TO_BE_DELIVERED, ProductOrderStatus.TO_BE_RECEIVED);
        String tracking = trackingNumber.trim();
        String carrier = carrierCode == null || carrierCode.isBlank() ? "auto" : carrierCode.trim();
        baseOrderRepository.updateTrackingNumber(id, tracking);
        updateCarrierCode(id, carrier);
        orderLogisticsService.recordShipped(id, tracking);
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.TO_BE_RECEIVED);
        userNotificationService.push(
                mysteryBoxOrder.creator().id(),
                "ORDER",
                "商品已发货",
                "物流单号 " + tracking + "，请注意查收",
                id
        );
        return id;
    }

    void updateCarrierCode(String orderId, String carrierCode) {
        jdbcTemplate.update(
                "UPDATE base_order SET carrier_code = ? WHERE id = ?",
                carrierCode,
                orderId
        );
    }

    @Transactional
    public int batchDeliver(List<OrderLogisticsService.BatchShipLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return 0;
        }
        int ok = 0;
        for (OrderLogisticsService.BatchShipLine line : lines) {
            if (line.orderId() == null || line.orderId().isBlank()
                    || line.trackingNumber() == null || line.trackingNumber().isBlank()) {
                continue;
            }
            try {
                deliver(line.orderId().trim(), line.trackingNumber().trim(), line.carrierCode());
                ok++;
            } catch (BusinessException ex) {
                log.warn("批量发货跳过 orderId={}, reason={}", line.orderId(), ex.getMessage());
            }
        }
        return ok;
    }

    /**
     * 用户确认收货
     */
    @Transactional
    public String confirmReceiveForUser(String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(id);
        checkOwner(order);
        checkStatus(order, ProductOrderStatus.TO_BE_RECEIVED);
        mysteryBoxOrderRepository.changeStatus(id, ProductOrderStatus.FINISHED);
        return id;
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
        if (!mysteryBoxOrder.creator().id().equals(cn.dev33.satoken.stp.StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED
                            .tokenMessage("非本人操作"));
        }
    }
}

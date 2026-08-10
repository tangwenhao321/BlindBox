package io.github.qifan777.server.logistics.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.logistics.service.LogisticsTrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("front/logistics")
@RequiredArgsConstructor
public class LogisticsForFrontController {
    private final LogisticsTrackingService logisticsTrackingService;
    private final OrderIdLookupService orderIdLookupService;

    @GetMapping("order/{orderId}")
    public LogisticsTrackingService.TrackingResult order(@PathVariable String orderId) {
        return logisticsTrackingService.trackOrder(
                StpUtil.getLoginIdAsString(),
                orderIdLookupService.resolveCurrentId(orderId)
        );
    }

    @GetMapping("track")
    public LogisticsTrackingService.TrackingResult track(
            @RequestParam String trackingNumber,
            @RequestParam(required = false) String carrierCode
    ) {
        return logisticsTrackingService.trackByNumber(trackingNumber, carrierCode);
    }

    @GetMapping("warehouse-ship/{requestId}")
    public LogisticsTrackingService.TrackingResult warehouseShip(@PathVariable String requestId) {
        return logisticsTrackingService.trackWarehouseShipRequest(StpUtil.getLoginIdAsString(), requestId);
    }
}

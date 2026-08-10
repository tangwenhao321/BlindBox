package io.github.qifan777.server.warehouse;

import cn.dev33.satoken.stp.StpUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/warehouse")
@RequiredArgsConstructor
public class WarehouseForFrontController {
    private final WarehouseService warehouseService;
    private final WarehouseShipService warehouseShipService;

    @GetMapping("items")
    public WarehouseListView items(
            @RequestParam(defaultValue = "false") boolean pendingOnly,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        var result = warehouseService.listItems(StpUtil.getLoginIdAsString(), pendingOnly, limit, offset);
        return new WarehouseListView(result.items(), result.approximate());
    }

    @GetMapping("items/count")
    public WarehouseCountView countItems(@RequestParam(defaultValue = "false") boolean pendingOnly) {
        var result = warehouseService.countItems(StpUtil.getLoginIdAsString(), pendingOnly);
        return new WarehouseCountView(result.count(), result.approximate());
    }

    @GetMapping("series-progress")
    public SeriesProgressView seriesProgress(@RequestParam String boxId) {
        return warehouseService.seriesProgress(StpUtil.getLoginIdAsString(), boxId);
    }

    @PostMapping("ship/quote")
    public WarehouseShipService.ShipQuoteView shipQuote(@RequestBody ShipBatchRequest request) {
        return warehouseShipService.quote(
                StpUtil.getLoginIdAsString(),
                request.addressId(),
                request.items()
        );
    }

    @PostMapping("ship/submit")
    public String shipSubmit(@RequestBody ShipBatchRequest request) {
        return warehouseShipService.submit(
                StpUtil.getLoginIdAsString(),
                request.addressId(),
                request.items()
        );
    }

    @GetMapping("ship/requests")
    public List<WarehouseShipService.ShipRequestSummary> shipRequests(
            @RequestParam(defaultValue = "20") int limit
    ) {
        return warehouseShipService.listForUser(StpUtil.getLoginIdAsString(), limit);
    }

    @PostMapping("ship/requests/{id}/cancel")
    public void cancelShipRequest(@PathVariable String id) {
        warehouseShipService.cancelForUser(StpUtil.getLoginIdAsString(), id);
    }

    public record ShipBatchRequest(
            String addressId,
            List<WarehouseShipService.ShipLineRequest> items
    ) {
    }

    public record SeriesProgressView(int collected, int totalInSeries) {
    }

    public record WarehouseCountView(int count, boolean approximate) {
    }

    public record WarehouseListView(List<WarehouseItemView> items, boolean approximate) {
    }

    public record WarehouseItemView(
            String orderId,
            String orderStatus,
            String orderItemId,
            String mysteryBoxId,
            String mysteryBoxName,
            String productId,
            String productName,
            String productCover,
            String qualityType,
            String source,
            String listingId,
            boolean pendingShipRequest,
            String mysteryBoxCover,
            String createdTime,
            Integer prizeCount
    ) {
    }
}

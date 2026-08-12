package io.github.qifan777.server.warehouse;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("admin/warehouse-ship-request")
@RequiredArgsConstructor
@SaCheckPermission("/warehouse-ship-request")
public class WarehouseShipForAdminController {
    private final WarehouseShipService warehouseShipService;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @PostMapping("query")
    public WarehouseShipService.AdminShipPage query(@RequestBody AdminQueryRequest request) {
        int pageNum = request.pageNum() == null ? 1 : request.pageNum();
        int pageSize = request.pageSize() == null ? 20 : request.pageSize();
        return warehouseShipService.adminQuery(request.status(), pageNum, pageSize);
    }

    @GetMapping("{id}")
    public WarehouseShipService.AdminShipRequestDetail detail(@PathVariable String id) {
        return warehouseShipService.adminDetail(id);
    }

    @PostMapping("{id}/ship")
    public void ship(@PathVariable String id,
                     @RequestBody ShipRequest body,
                     @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        warehouseShipService.fulfillForAdmin(id, body.trackingNumber(), body.carrierCode());
    }

    @PostMapping("{id}/reject")
    public void reject(@PathVariable String id,
                       @RequestBody(required = false) RejectRequest body,
                       @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        warehouseShipService.rejectForAdmin(id, body == null ? null : body.reason());
    }

    public record AdminQueryRequest(String status, Integer pageNum, Integer pageSize) {
    }

    public record ShipRequest(String trackingNumber, String carrierCode) {
    }

    public record RejectRequest(String reason) {
    }
}

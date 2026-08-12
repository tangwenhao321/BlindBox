package io.github.qifan777.server.marketplace.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import io.github.qifan777.server.marketplace.MarketplaceService;
import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.ApiIgnore;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@ApiIgnore
@RestController
@RequestMapping("admin/marketplace")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class MarketplaceForAdminController {
    private final MarketplaceService marketplaceService;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @GetMapping("trades/pending-external")
    public List<MarketplaceService.PendingExternalTradeView> listPendingExternal(
            @RequestParam(defaultValue = "50") int limit
    ) {
        return marketplaceService.listPendingExternalTrades(limit);
    }

    @PostMapping("trades/{tradeId}/complete-external")
    public Map<String, Object> completeExternal(
            @PathVariable String tradeId,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "x-admin-action-otp", required = false) String otp
    ) {
        adminActionOtpVerifier.assertValid(otp);
        String externalTxnId = body == null ? null : body.get("externalTxnId");
        if (externalTxnId == null && body != null) {
            externalTxnId = body.get("external_txn_id");
        }
        marketplaceService.completeExternalPayout(tradeId, externalTxnId);
        return Map.of("ok", true, "tradeId", tradeId, "status", "COMPLETED");
    }

    @PostMapping("certificates/{certificateId}/approve")
    public Map<String, Object> approveCertificate(
            @PathVariable String certificateId,
            @RequestHeader(value = "x-admin-action-otp", required = false) String otp
    ) {
        adminActionOtpVerifier.assertValid(otp);
        marketplaceService.approveCertificate(certificateId);
        return Map.of("ok", true, "certificateId", certificateId, "status", "APPROVED");
    }

    @PostMapping("certificates/{certificateId}/reject")
    public Map<String, Object> rejectCertificate(
            @PathVariable String certificateId,
            @RequestHeader(value = "x-admin-action-otp", required = false) String otp
    ) {
        adminActionOtpVerifier.assertValid(otp);
        marketplaceService.rejectCertificate(certificateId);
        return Map.of("ok", true, "certificateId", certificateId, "status", "REJECTED");
    }

    @PostMapping("trades/{tradeId}/fail-external")
    public Map<String, Object> failExternal(
            @PathVariable String tradeId,
            @RequestHeader(value = "x-admin-action-otp", required = false) String otp
    ) {
        adminActionOtpVerifier.assertValid(otp);
        marketplaceService.failExternalPayout(tradeId);
        return Map.of("ok", true, "tradeId", tradeId, "status", "FAILED_EXTERNAL");
    }
}

package io.github.qifan777.server.box.item.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderItemRedeemService;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("front/mystery-box-order-item")
@RequiredArgsConstructor
@Transactional
public class MysteryBoxOrderItemForFrontController {
    private final MysteryBoxOrderItemRedeemService mysteryBoxOrderItemRedeemService;
    private final io.github.qifan777.server.infrastructure.compliance.IosDigitalGoodsGuard iosDigitalGoodsGuard;
    private final UserComplianceService userComplianceService;

    @PostMapping("{itemId}/redeem-balance")
    public BigDecimal redeemBalance(@PathVariable String itemId, @RequestBody Map<String, String> body) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        return mysteryBoxOrderItemRedeemService.redeemItemToBalance(
                StpUtil.getLoginIdAsString(),
                itemId,
                body.get("productId")
        );
    }
}

package io.github.qifan777.server.fragment.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.fragment.model.FragmentProgressView;
import io.github.qifan777.server.fragment.service.UserFragmentService;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/fragment")
@RequiredArgsConstructor
@Transactional
public class FragmentForFrontController {
    private final UserFragmentService userFragmentService;
    private final io.github.qifan777.server.infrastructure.compliance.IosDigitalGoodsGuard iosDigitalGoodsGuard;
    private final UserComplianceService userComplianceService;

    @GetMapping("balance")
    public Map<String, Integer> balance() {
        return Map.of("balance", userFragmentService.balance(StpUtil.getLoginIdAsString()));
    }

    @GetMapping("progress")
    public FragmentProgressView progress() {
        return userFragmentService.progress(StpUtil.getLoginIdAsString());
    }

    @GetMapping("exchange-skus")
    public List<UserFragmentService.FragmentSkuView> skus() {
        return userFragmentService.listSkus();
    }

    @PostMapping("exchange/{skuId}")
    public void exchange(
            @PathVariable String skuId,
            @RequestHeader(value = "x-idempotency-key", required = false) String idempotencyKey
    ) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        userFragmentService.exchangeSku(StpUtil.getLoginIdAsString(), skuId, idempotencyKey);
    }

    @PostMapping("surprise-bonus")
    public Map<String, Object> surpriseBonus(@RequestBody Map<String, String> body) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        return userFragmentService.grantSurpriseEffectBonus(
                StpUtil.getLoginIdAsString(),
                body == null ? null : body.get("orderId")
        );
    }

    @PostMapping("decompose")
    public void decompose(@RequestBody Map<String, String> body) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        userComplianceService.assertAgeConfirmed(StpUtil.getLoginIdAsString());
        userFragmentService.decomposeOrderItem(
                StpUtil.getLoginIdAsString(),
                body.get("orderItemId"),
                body.get("productId")
        );
    }
}

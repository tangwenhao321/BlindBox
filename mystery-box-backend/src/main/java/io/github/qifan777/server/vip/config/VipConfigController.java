package io.github.qifan777.server.vip.config;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.vip.root.service.VipService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequestMapping("vip-config")
@RestController
@AllArgsConstructor
public class VipConfigController {
    private final VipConfigRepository vipConfigRepository;

    @GetMapping
    public VipConfig getConfig() {
        return vipConfigRepository.get();
    }

    @SaCheckPermission("/vip-config")
    @PostMapping
    public void saveConfig(@RequestBody VipConfig vipConfig) {
        if (vipConfig == null || VipService.clampFold(vipConfig.getDiscount()) == null) {
            throw new BusinessException(
                    "VIP折扣须在 " + VipService.MIN_DISCOUNT_FOLD + "–" + VipService.MAX_DISCOUNT_FOLD
                            + "（折，如 9.5 表示 95 折）");
        }
        vipConfigRepository.save(vipConfig);
    }

}

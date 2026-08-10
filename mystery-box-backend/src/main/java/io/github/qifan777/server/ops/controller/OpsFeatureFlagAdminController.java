package io.github.qifan777.server.ops.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import io.github.qifan777.server.ops.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("admin/ops/feature-flag")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class OpsFeatureFlagAdminController {
    private final FeatureFlagService featureFlagService;

    @GetMapping
    public List<FeatureFlagService.FeatureFlag> list() {
        return featureFlagService.list();
    }

    @GetMapping("{flagKey}")
    public FeatureFlagService.FeatureFlag get(@PathVariable String flagKey) {
        return featureFlagService.getByKey(flagKey);
    }

    @PostMapping
    public FeatureFlagService.FeatureFlag create(@RequestBody FeatureFlagService.FeatureFlagInput input) {
        return featureFlagService.create(input);
    }

    @PutMapping("{flagKey}")
    public FeatureFlagService.FeatureFlag update(@PathVariable String flagKey,
                                                 @RequestBody FeatureFlagService.FeatureFlagInput input) {
        return featureFlagService.update(flagKey, input);
    }

    @DeleteMapping("{flagKey}")
    public Boolean delete(@PathVariable String flagKey) {
        featureFlagService.delete(flagKey);
        return true;
    }
}

package io.github.qifan777.server.ops.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.ops.service.AppRevealConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/ops/app-config")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class OpsAppConfigAdminController {
    private final AppRevealConfigService appRevealConfigService;

    @GetMapping("version")
    public List<AppRevealConfigService.ConfigVersion> listVersions() {
        return appRevealConfigService.listVersions();
    }

    @GetMapping("version/{id}")
    public AppRevealConfigService.ConfigVersion getVersion(@PathVariable String id) {
        return appRevealConfigService.getVersion(id);
    }

    @GetMapping("version/{id}/export")
    public Map<String, Object> exportVersion(@PathVariable String id) {
        return appRevealConfigService.exportVersionJson(id);
    }

    @GetMapping("templates/{templateId}/export")
    public Map<String, Object> exportTemplate(@PathVariable String templateId) {
        return appRevealConfigService.exportTemplateJson(templateId);
    }

    @PostMapping("version")
    public AppRevealConfigService.ConfigVersion createVersion(@RequestBody AppRevealConfigService.VersionInput input) {
        return appRevealConfigService.createVersion(input, currentOperator());
    }

    @PutMapping("version/{id}")
    public AppRevealConfigService.ConfigVersion updateVersion(@PathVariable String id,
                                                              @RequestBody AppRevealConfigService.VersionInput input) {
        return appRevealConfigService.updateVersion(id, input, currentOperator());
    }

    @DeleteMapping("version/{id}")
    public Boolean deleteVersion(@PathVariable String id) {
        appRevealConfigService.deleteVersion(id, currentOperator());
        return true;
    }

    @PostMapping("version/{id}/publish")
    public AppRevealConfigService.ConfigVersion publishVersion(@PathVariable String id) {
        return appRevealConfigService.publishVersion(id, currentOperator());
    }

    @PostMapping("rollback")
    public AppRevealConfigService.ConfigVersion rollback() {
        return appRevealConfigService.rollback(currentOperator());
    }

    @GetMapping("version/{versionId}/rollout")
    public List<AppRevealConfigService.RolloutRule> listRollouts(@PathVariable String versionId) {
        return appRevealConfigService.listRollouts(versionId);
    }

    @GetMapping("rollout/{id}")
    public AppRevealConfigService.RolloutRule getRollout(@PathVariable String id) {
        return appRevealConfigService.getRollout(id);
    }

    @PostMapping("rollout")
    public AppRevealConfigService.RolloutRule createRollout(@RequestBody AppRevealConfigService.RolloutInput input) {
        return appRevealConfigService.createRollout(input, currentOperator());
    }

    @PutMapping("rollout/{id}")
    public AppRevealConfigService.RolloutRule updateRollout(@PathVariable String id,
                                                            @RequestBody AppRevealConfigService.RolloutInput input) {
        return appRevealConfigService.updateRollout(id, input, currentOperator());
    }

    @DeleteMapping("rollout/{id}")
    public Boolean deleteRollout(@PathVariable String id) {
        appRevealConfigService.deleteRollout(id, currentOperator());
        return true;
    }

    @GetMapping("templates")
    public List<AppRevealConfigService.ConfigTemplate> listTemplates() {
        return appRevealConfigService.listTemplates();
    }

    @GetMapping("version/{versionId}/audit")
    public List<AppRevealConfigService.AuditLogEntry> listAuditLogs(@PathVariable String versionId) {
        return appRevealConfigService.listAuditLogs(versionId);
    }

    private static String currentOperator() {
        return StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : "system";
    }
}

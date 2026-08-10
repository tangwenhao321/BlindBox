package io.github.qifan777.server.box.order.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.box.order.OrderIdMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/order-id-migration")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box-order")
public class OrderIdMigrationForAdminController {

    private final OrderIdLookupService orderIdLookupService;
    private final OrderIdMigrationService orderIdMigrationService;

    @GetMapping("audit")
    public OrderIdLookupService.LegacyOrderAuditView audit(
            @RequestParam(defaultValue = "20") int sampleSize
    ) {
        return orderIdLookupService.auditLegacyOrders(sampleSize);
    }

    @PostMapping("mapping")
    public Map<String, Object> registerMapping(@RequestBody Map<String, String> body) {
        int rows = orderIdLookupService.registerMapping(body.get("legacyId"), body.get("currentId"));
        return Map.of("updated", rows);
    }

    @PostMapping("prepare-mappings")
    public Map<String, Object> prepareMappings(@RequestParam(defaultValue = "100") int batchSize) {
        int created = orderIdLookupService.prepareSnowflakeMappings(batchSize);
        return Map.of("created", created);
    }

    @GetMapping("pending")
    public List<String> pending(@RequestParam(defaultValue = "50") int limit) {
        return orderIdLookupService.listPendingMigrationIds(limit);
    }

    @GetMapping("rewrite/dry-run")
    public List<OrderIdMigrationService.PkRewritePlan> dryRunRewrite(
            @RequestParam(defaultValue = "20") int batchSize
    ) {
        return orderIdMigrationService.dryRunBatch(batchSize);
    }

    @GetMapping("rewrite/dry-run/{legacyId}")
    public OrderIdMigrationService.PkRewritePlan dryRunRewriteOne(@PathVariable String legacyId) {
        return orderIdMigrationService.dryRunOne(legacyId);
    }

    @GetMapping("rewrite/log")
    public List<OrderIdMigrationService.MigrationLogEntry> rewriteLog(
            @RequestParam(defaultValue = "50") int limit
    ) {
        return orderIdMigrationService.listMigrationLog(limit);
    }

    @GetMapping("preflight")
    public OrderIdMigrationService.MigrationPreflightView preflight() {
        return orderIdMigrationService.preflight();
    }

    @PostMapping("rewrite/{legacyId}")
    public OrderIdMigrationService.PkRewriteResult applyRewriteOne(
            @PathVariable String legacyId,
            @RequestParam String confirm
    ) {
        return orderIdMigrationService.applyOne(legacyId, confirm, StpUtil.getLoginIdAsString());
    }

    @PostMapping("rewrite/batch")
    public List<OrderIdMigrationService.PkRewriteResult> applyRewriteBatch(
            @RequestParam(defaultValue = "10") int batchSize,
            @RequestParam String confirm
    ) {
        return orderIdMigrationService.applyBatch(batchSize, confirm, StpUtil.getLoginIdAsString());
    }
}

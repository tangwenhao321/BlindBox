package io.github.qifan777.server.box.win.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLog;
import io.github.qifan777.server.box.win.repository.MysteryBoxWinRuleRepository;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("admin/mystery-box-win-rule")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box-order")
@Slf4j
public class MysteryBoxWinRuleForAdminController {
    private final MysteryBoxWinRuleService mysteryBoxWinRuleService;
    private final MysteryBoxWinRuleRepository mysteryBoxWinRuleRepository;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @PostMapping("create")
    public String create(@RequestBody CreateRequest request,
                         @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        return mysteryBoxWinRuleService.createRule(
                request.getUserId(),
                request.getMysteryBoxId(),
                request.getProductId(),
                request.getRemainingCount(),
                request.getRemark()
        );
    }

    @GetMapping("query")
    public List<MysteryBoxWinRule> query() {
        return mysteryBoxWinRuleRepository.findAll(MysteryBoxWinRuleRepository.SIMPLE_FETCHER);
    }

    @GetMapping("hit-log")
    public List<MysteryBoxWinHitLog> queryHitLog(@RequestParam(required = false, defaultValue = "50") int limit,
                                                 @RequestParam(required = false) String userId,
                                                 @RequestParam(required = false) String mysteryBoxOrderId,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdTimeStart,
                                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime createdTimeEnd) {
        return mysteryBoxWinRuleService.queryLatestLogs(limit, userId, mysteryBoxOrderId, createdTimeStart, createdTimeEnd);
    }

    @GetMapping("op-log")
    public List<MysteryBoxWinRuleOpLog> queryOpLog(@RequestParam(required = false, defaultValue = "50") int limit) {
        return mysteryBoxWinRuleService.queryLatestOpLogs(limit);
    }

    @GetMapping("metrics")
    public java.util.Map<String, Long> metrics() {
        return mysteryBoxWinRuleService.queryOpCounters();
    }

    @PostMapping("{id}/approve")
    public Boolean approve(@PathVariable String id,
                           @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        mysteryBoxWinRuleService.approveRule(id);
        return true;
    }

    @PostMapping("{id}/enable")
    public Boolean setEnabled(@PathVariable String id,
                              @RequestParam boolean enabled,
                              @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        mysteryBoxWinRuleService.setEnabled(id, enabled);
        return true;
    }

    @DeleteMapping("{id}")
    public Boolean delete(@PathVariable String id,
                          @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        mysteryBoxWinRuleService.deleteRule(id);
        return true;
    }

    @Data
    public static class CreateRequest {
        private String userId;
        private String mysteryBoxId;
        private String productId;
        private int remainingCount;
        private String remark;
    }
}

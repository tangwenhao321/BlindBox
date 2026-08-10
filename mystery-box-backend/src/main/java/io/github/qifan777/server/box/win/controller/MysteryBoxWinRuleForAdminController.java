package io.github.qifan777.server.box.win.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLog;
import io.github.qifan777.server.box.win.repository.MysteryBoxWinRuleRepository;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("admin/mystery-box-win-rule")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box-order")
@Slf4j
public class MysteryBoxWinRuleForAdminController {
    private static final int OTP_MAX_FAILURE = 5;
    private static final long OTP_LOCK_MS = 10 * 60 * 1000L;
    private static final Map<String, OtpFailState> OTP_FAIL_CACHE = new ConcurrentHashMap<>();

    private final MysteryBoxWinRuleService mysteryBoxWinRuleService;
    private final MysteryBoxWinRuleRepository mysteryBoxWinRuleRepository;
    @Value("${security.admin-action-otp:}")
    private String adminActionOtp;

    @PostMapping("create")
    public String create(@RequestBody CreateRequest request,
                         @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        assertActionOtp(otp);
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
        assertActionOtp(otp);
        mysteryBoxWinRuleService.approveRule(id);
        return true;
    }

    @PostMapping("{id}/enable")
    public Boolean setEnabled(@PathVariable String id,
                              @RequestParam boolean enabled,
                              @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        assertActionOtp(otp);
        mysteryBoxWinRuleService.setEnabled(id, enabled);
        return true;
    }

    @DeleteMapping("{id}")
    public Boolean delete(@PathVariable String id,
                          @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        assertActionOtp(otp);
        mysteryBoxWinRuleService.deleteRule(id);
        return true;
    }

    private void assertActionOtp(String otp) {
        String traceId = resolveTraceId();
        if (adminActionOtp == null || adminActionOtp.isBlank()) {
            log.error("security_audit otp_config_missing traceId={} uri={}", traceId, getRequestUri());
            throw new BusinessException(ResultCode.ParamSetIllegal, "服务端未配置 admin-action-otp");
        }
        if (isWeakOtp(adminActionOtp)) {
            log.error("security_audit otp_config_weak traceId={} uri={}", traceId, getRequestUri());
            throw new BusinessException(ResultCode.ParamSetIllegal, "服务端 admin-action-otp 配置过弱，请使用高强度口令");
        }
        String actorId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : "anonymous";
        String clientIp = getClientIp();
        String requestUri = getRequestUri();
        OtpFailState failState = OTP_FAIL_CACHE.computeIfAbsent(actorId, key -> new OtpFailState());
        OtpFailState ipFailState = OTP_FAIL_CACHE.computeIfAbsent("ip:" + clientIp, key -> new OtpFailState());
        long now = System.currentTimeMillis();
        if (failState.lockUntilMs > now) {
            log.warn("security_audit otp_locked_actor traceId={} actorId={} ip={} uri={} unlockInMs={}",
                    traceId, actorId, clientIp, requestUri, failState.lockUntilMs - now);
            throw new BusinessException(ResultCode.ParamSetIllegal, "口令错误次数过多，请稍后重试");
        }
        if (ipFailState.lockUntilMs > now) {
            log.warn("security_audit otp_locked_ip traceId={} actorId={} ip={} uri={} unlockInMs={}",
                    traceId, actorId, clientIp, requestUri, ipFailState.lockUntilMs - now);
            throw new BusinessException(ResultCode.ParamSetIllegal, "该来源口令错误次数过多，请稍后重试");
        }
        if (otp == null) {
            recordOtpFailure(actorId, now);
            recordOtpFailure("ip:" + clientIp, now);
            log.warn("security_audit otp_failed_missing_header traceId={} actorId={} ip={} uri={}", traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "高危操作口令校验失败");
        }
        byte[] configured = adminActionOtp.trim().getBytes(StandardCharsets.UTF_8);
        byte[] provided = otp.trim().getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(configured, provided)) {
            recordOtpFailure(actorId, now);
            recordOtpFailure("ip:" + clientIp, now);
            log.warn("security_audit otp_failed_mismatch traceId={} actorId={} ip={} uri={}", traceId, actorId, clientIp, requestUri);
            throw new BusinessException(ResultCode.ParamSetIllegal, "高危操作口令校验失败");
        }
        OTP_FAIL_CACHE.remove(actorId);
        OTP_FAIL_CACHE.remove("ip:" + clientIp);
        log.info("security_audit otp_passed traceId={} actorId={} ip={} uri={}", traceId, actorId, clientIp, requestUri);
    }

    private void recordOtpFailure(String actorId, long now) {
        OtpFailState failState = OTP_FAIL_CACHE.computeIfAbsent(actorId, key -> new OtpFailState());
        if (now - failState.lastFailureMs > OTP_LOCK_MS) {
            failState.failCount = 0;
        }
        failState.failCount += 1;
        failState.lastFailureMs = now;
        if (failState.failCount >= OTP_MAX_FAILURE) {
            failState.lockUntilMs = now + OTP_LOCK_MS;
        }
    }

    private static class OtpFailState {
        private int failCount;
        private long lastFailureMs;
        private long lockUntilMs;
    }

    private boolean isWeakOtp(String otp) {
        String value = otp == null ? "" : otp.trim();
        if (value.length() < 8) {
            return true;
        }
        // Block trivial repeated patterns like 11111111.
        return value.chars().distinct().count() <= 2;
    }

    private String getClientIp() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "unknown";
        }
        HttpServletRequest request = attrs.getRequest();
        String headerIp = request.getHeader("X-Forwarded-For");
        if (headerIp != null && !headerIp.isBlank()) {
            return headerIp.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getRequestUri() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return "unknown";
        }
        return attrs.getRequest().getRequestURI();
    }

    private String resolveTraceId() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return UUID.randomUUID().toString();
        }
        HttpServletRequest request = attrs.getRequest();
        String traceId = request.getHeader("X-Request-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader("X-Trace-Id");
        }
        if (traceId == null || traceId.isBlank()) {
            Object existing = request.getAttribute("traceId");
            traceId = existing instanceof String ? (String) existing : "";
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
            request.setAttribute("traceId", traceId);
        }
        return traceId;
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

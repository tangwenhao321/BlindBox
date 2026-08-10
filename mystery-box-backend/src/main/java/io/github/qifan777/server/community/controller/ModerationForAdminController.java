package io.github.qifan777.server.community.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.community.service.CommunityDomainService;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/moderation")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class ModerationForAdminController {
    private final CommunityDomainService communityDomainService;
    private final AuditTrailService auditTrailService;

    @GetMapping("reports")
    public List<CommunityDomainService.CommunityReport> reports(@RequestParam(required = false) String status) {
        return communityDomainService.listReports(status);
    }

    @PostMapping("reports/{reportId}/status")
    public CommunityDomainService.CommunityReport moderateReport(@PathVariable String reportId,
                                                                 @RequestBody Map<String, String> body,
                                                                 @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return communityDomainService.moderateReport(
                currentUserId(),
                reportId,
                body.getOrDefault("status", "APPROVED"),
                body.getOrDefault("remark", ""),
                traceId
        );
    }

    @PostMapping("posts/{postId}/status")
    public CommunityDomainService.CommunityPost moderatePost(@PathVariable String postId,
                                                             @RequestBody Map<String, String> body,
                                                             @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return communityDomainService.moderatePost(currentUserId(), postId, body.getOrDefault("status", "APPROVED"), traceId);
    }

    @GetMapping("audit/latest")
    public List<Map<String, Object>> latestAudit(@RequestParam(defaultValue = "50") int limit) {
        return auditTrailService.latest(limit);
    }

    private String currentUserId() {
        return String.valueOf(StpUtil.getLoginIdDefaultNull());
    }
}

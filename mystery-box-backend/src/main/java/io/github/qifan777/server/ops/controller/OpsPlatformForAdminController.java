package io.github.qifan777.server.ops.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.ops.service.OpsPlatformService;
import io.github.qifan777.server.payment.config.MarketPaymentHealthView;
import io.github.qifan777.server.payment.service.MarketPaymentHealthService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/ops")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class OpsPlatformForAdminController {
    private final OpsPlatformService opsPlatformService;
    private final PaymentReliabilityService paymentReliabilityService;
    private final MarketPaymentHealthService marketPaymentHealthService;
    private final JobRunAuditService jobRunAuditService;
    private final AuditTrailService auditTrailService;

    @PostMapping("campaigns")
    public OpsPlatformService.Campaign createCampaign(@RequestBody Map<String, String> body,
                                                      @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.createCampaign(currentUserId(), body.getOrDefault("name", "未命名活动"), traceId);
    }

    @GetMapping("campaigns")
    public List<OpsPlatformService.Campaign> campaigns() {
        return opsPlatformService.listCampaigns();
    }

    @PostMapping("segments")
    public OpsPlatformService.Segment createSegment(@RequestBody Map<String, String> body,
                                                    @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.createSegment(
                currentUserId(),
                body.getOrDefault("name", "新分群"),
                body.getOrDefault("rule", "{}"),
                traceId
        );
    }

    @GetMapping("segments")
    public List<OpsPlatformService.Segment> segments() {
        return opsPlatformService.listSegments();
    }

    @PostMapping("message-tasks")
    public OpsPlatformService.MessageTask createMessageTask(@RequestBody Map<String, String> body,
                                                            @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.createMessageTask(
                currentUserId(),
                body.getOrDefault("templateName", "默认模板"),
                body.getOrDefault("segmentId", ""),
                traceId
        );
    }

    @PostMapping("message-tasks/{taskId}/run")
    public OpsPlatformService.MessageTask runMessageTask(@PathVariable String taskId,
                                                         @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.runMessageTask(currentUserId(), taskId, traceId);
    }

    @GetMapping("message-tasks")
    public List<OpsPlatformService.MessageTask> messageTasks() {
        return opsPlatformService.listMessageTasks();
    }

    @PostMapping("tickets")
    public OpsPlatformService.Ticket createTicket(@RequestBody Map<String, String> body,
                                                  @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.createTicket(
                currentUserId(),
                body.getOrDefault("title", "未命名工单"),
                body.getOrDefault("content", ""),
                traceId
        );
    }

    @PostMapping("tickets/{ticketId}/status")
    public OpsPlatformService.Ticket updateTicket(@PathVariable String ticketId,
                                                  @RequestBody Map<String, String> body,
                                                  @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return opsPlatformService.updateTicketStatus(currentUserId(), ticketId, body.getOrDefault("status", "CLOSED"), traceId);
    }

    @GetMapping("tickets")
    public List<OpsPlatformService.Ticket> tickets() {
        return opsPlatformService.listTickets();
    }

    @GetMapping("payment/health")
    public PaymentReliabilityService.PaymentHealthOverview paymentHealth(@RequestParam(required = false) Integer recentMinutes) {
        return paymentReliabilityService.healthOverview(recentMinutes);
    }

    @GetMapping("payment/market")
    public MarketPaymentHealthView paymentMarket() {
        return marketPaymentHealthService.overview();
    }

    @GetMapping("jobs/recent")
    public List<Map<String, Object>> recentJobRuns(@RequestParam(required = false) String jobName,
                                                   @RequestParam(defaultValue = "20") int limit) {
        return jobRunAuditService.recentRuns(jobName, limit);
    }

    @GetMapping("audit/latest")
    public List<Map<String, Object>> latestAudit(@RequestParam(defaultValue = "20") int limit) {
        return auditTrailService.latest(limit);
    }

    private String currentUserId() {
        return String.valueOf(StpUtil.getLoginIdDefaultNull());
    }
}

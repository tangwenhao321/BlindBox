package io.github.qifan777.server.ops.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.ops.service.AnalyticsEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AnalyticsForOpsController {
    private final AnalyticsEventService analyticsEventService;

    @Value("${security.analytics.enabled:true}")
    private boolean analyticsEnabled;

    @PostMapping("front/analytics/events")
    public Integer ingest(@RequestBody List<AnalyticsEventService.AnalyticsEventInput> payload) {
        return analyticsEventService.ingest(payload, String.valueOf(StpUtil.getLoginIdDefaultNull()));
    }

    /** Guest / pre-login funnel events keyed by deviceId in payload. */
    @SaIgnore
    @PostMapping("front/analytics/events/guest")
    public Integer ingestGuest(@RequestBody List<AnalyticsEventService.AnalyticsEventInput> payload) {
        if (!analyticsEnabled) {
            return 0;
        }
        String actor = resolveGuestActor(payload);
        return analyticsEventService.ingest(payload, actor);
    }

    private static String resolveGuestActor(List<AnalyticsEventService.AnalyticsEventInput> payload) {
        if (payload == null) {
            return "guest:unknown";
        }
        for (AnalyticsEventService.AnalyticsEventInput item : payload) {
            if (item == null || item.payload() == null) {
                continue;
            }
            Object deviceId = item.payload().get("deviceId");
            if (deviceId != null && !String.valueOf(deviceId).isBlank()) {
                return "guest:" + String.valueOf(deviceId).trim();
            }
        }
        return "guest:unknown";
    }

    @GetMapping("admin/ops/analytics/funnel")
    @SaCheckRole("管理员")
    public AnalyticsEventService.FunnelView funnel(@RequestParam(required = false) Integer recentMinutes) {
        return analyticsEventService.funnel(recentMinutes);
    }

    @GetMapping("admin/ops/analytics/events")
    @SaCheckRole("管理员")
    public List<AnalyticsEventService.AnalyticsEvent> latest(@RequestParam(defaultValue = "100") int limit,
                                                             @RequestParam(required = false) Integer recentMinutes) {
        return analyticsEventService.latest(limit, recentMinutes);
    }

    /** Trace recent events for a user id or guest device actor (e.g. guest:abc or raw device id). */
    @GetMapping("admin/ops/analytics/trace")
    @SaCheckRole("管理员")
    public List<AnalyticsEventService.AnalyticsEvent> trace(@RequestParam String actor,
                                                           @RequestParam(defaultValue = "80") int limit,
                                                           @RequestParam(required = false) Integer recentMinutes,
                                                           @RequestParam(required = false) String eventName,
                                                           @RequestParam(required = false) String boxId) {
        return analyticsEventService.eventsByActor(actor, limit, recentMinutes, eventName, boxId);
    }

    @GetMapping("admin/ops/analytics/trend")
    @SaCheckRole("管理员")
    public List<AnalyticsEventService.TrendPoint> trend(@RequestParam(required = false) Integer recentMinutes) {
        return analyticsEventService.trendByHour(recentMinutes);
    }

    @GetMapping("admin/ops/analytics/top")
    @SaCheckRole("管理员")
    public List<AnalyticsEventService.TopEventItem> top(@RequestParam(defaultValue = "10") int limit,
                                                         @RequestParam(required = false) Integer recentMinutes) {
        return analyticsEventService.topEvents(recentMinutes, limit);
    }

    @GetMapping("admin/ops/analytics/retention")
    @SaCheckRole("管理员")
    public AnalyticsEventService.RetentionOverview retention() {
        return analyticsEventService.retentionOverview();
    }
}

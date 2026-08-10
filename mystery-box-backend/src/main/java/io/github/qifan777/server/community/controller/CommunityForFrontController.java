package io.github.qifan777.server.community.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.community.service.CommunityDomainService;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.security.AuthErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/community")
@RequiredArgsConstructor
public class CommunityForFrontController {
    private final CommunityDomainService communityDomainService;

    @GetMapping("posts")
    public Object posts(@RequestParam(required = false) Integer pageNum,
                        @RequestParam(required = false) Integer pageSize) {
        if (pageNum != null && pageSize != null) {
            return communityDomainService.listPostsPage(pageNum, pageSize);
        }
        return communityDomainService.listPosts();
    }

    @PostMapping("notifications/read")
    public Map<String, Integer> markNotificationsRead(@RequestBody Map<String, List<String>> body) {
        List<String> ids = body == null ? List.of() : body.getOrDefault("ids", List.of());
        return Map.of("updated", communityDomainService.markNotificationsRead(requireUserId(), ids));
    }

    @PostMapping("posts")
    public CommunityDomainService.CommunityPost createPost(@RequestBody Map<String, String> body,
                                                           @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        String orderId = body.get("orderId");
        if (orderId != null && orderId.isBlank()) {
            orderId = null;
        }
        return communityDomainService.createPost(requireUserId(), body.getOrDefault("content", ""), orderId, traceId);
    }

    @PostMapping("posts/{postId}/comment")
    public CommunityDomainService.CommunityPost comment(@PathVariable String postId,
                                                        @RequestBody Map<String, String> body,
                                                        @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return communityDomainService.commentPost(requireUserId(), postId, body.getOrDefault("content", ""), traceId);
    }

    @PostMapping("posts/{postId}/like")
    public CommunityDomainService.CommunityPost like(@PathVariable String postId,
                                                     @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return communityDomainService.toggleLike(requireUserId(), postId, traceId);
    }

    @PostMapping("follow/{targetUserId}")
    public Map<String, Integer> follow(@PathVariable String targetUserId,
                                       @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return Map.of("followCount", communityDomainService.follow(requireUserId(), targetUserId, traceId));
    }

    @GetMapping("notifications")
    public List<CommunityDomainService.CommunityNotification> notifications() {
        return communityDomainService.listNotifications(requireUserId());
    }

    @PostMapping("reports")
    public CommunityDomainService.CommunityReport report(@RequestBody Map<String, String> body,
                                                         @RequestHeader(value = "x-trace-id", required = false) String traceId) {
        return communityDomainService.createReport(
                requireUserId(),
                body.getOrDefault("targetType", "post"),
                body.getOrDefault("targetId", ""),
                body.getOrDefault("reason", ""),
                traceId
        );
    }

    private String requireUserId() {
        StpUtil.checkLogin();
        return StpUtil.getLoginIdAsString();
    }
}

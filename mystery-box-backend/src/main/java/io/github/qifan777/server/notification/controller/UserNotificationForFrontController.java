package io.github.qifan777.server.notification.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.notification.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/notifications")
@RequiredArgsConstructor
public class UserNotificationForFrontController {
    private final UserNotificationService userNotificationService;

    @GetMapping
    public List<UserNotificationService.NotificationView> list(
            @RequestParam(defaultValue = "20") int limit
    ) {
        return userNotificationService.listForUser(StpUtil.getLoginIdAsString(), limit);
    }

    @GetMapping("unread-count")
    public Map<String, Integer> unreadCount() {
        return Map.of("count", userNotificationService.unreadCount(StpUtil.getLoginIdAsString()));
    }

    @PostMapping("mark-read")
    public void markRead(@RequestBody List<String> ids) {
        userNotificationService.markRead(StpUtil.getLoginIdAsString(), ids);
    }
}

package io.github.qifan777.server.appversion.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.appversion.service.AppVersionPushService;
import io.github.qifan777.server.appversion.service.AppVersionReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("admin/app-version")
@RequiredArgsConstructor
@SaCheckRole("管理员")
public class AppVersionAdminController {
    private final AppVersionReleaseService appVersionReleaseService;
    private final AppVersionPushService appVersionPushService;

    @GetMapping
    public List<AppVersionReleaseService.Release> list(@RequestParam(required = false) String platform) {
        return appVersionReleaseService.list(platform);
    }

    @GetMapping("{id}")
    public AppVersionReleaseService.Release get(@PathVariable String id) {
        return appVersionReleaseService.get(id);
    }

    @PostMapping
    public AppVersionReleaseService.Release create(@RequestBody AppVersionReleaseService.ReleaseInput input) {
        return appVersionReleaseService.create(input, currentOperator());
    }

    @PutMapping("{id}")
    public AppVersionReleaseService.Release update(
            @PathVariable String id,
            @RequestBody AppVersionReleaseService.ReleaseInput input
    ) {
        return appVersionReleaseService.update(id, input, currentOperator());
    }

    @DeleteMapping("{id}")
    public Boolean delete(@PathVariable String id) {
        appVersionReleaseService.delete(id);
        return true;
    }

    /**
     * Publishing makes the release visible to {@code front/app/update-check} and, unless the release
     * opted out, immediately fans out an APP_UPDATE push so users do not have to reopen the app first.
     */
    @PostMapping("{id}/publish")
    public AppVersionReleaseService.Release publish(@PathVariable String id) {
        AppVersionReleaseService.Release release = appVersionReleaseService.publish(id, currentOperator());
        if (release.autoPush()) {
            appVersionPushService.broadcastAsync(release.id(), "PUBLISH", currentOperator());
        }
        return release;
    }

    @PostMapping("{id}/archive")
    public AppVersionReleaseService.Release archive(@PathVariable String id) {
        return appVersionReleaseService.archive(id, currentOperator());
    }

    /** Re-sends the update notice, e.g. to reach users who installed after the original publish. */
    @PostMapping("{id}/push")
    public Integer push(@PathVariable String id) {
        return appVersionPushService.broadcast(id, "MANUAL", currentOperator());
    }

    @GetMapping("{id}/push-log")
    public List<AppVersionReleaseService.PushLogEntry> pushLogs(@PathVariable String id) {
        return appVersionReleaseService.listPushLogs(id);
    }

    private static String currentOperator() {
        return StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : "system";
    }
}

package io.github.qifan777.server.leaderboard.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.leaderboard.model.LeaderboardMeView;
import io.github.qifan777.server.leaderboard.service.DrawLeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/leaderboard")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DrawLeaderboardForFrontController {
    private final DrawLeaderboardService drawLeaderboardService;

    @GetMapping("weekly")
    public List<DrawLeaderboardService.LeaderboardEntryView> weekly(
            @RequestParam(required = false) String mysteryBoxId
    ) {
        return drawLeaderboardService.weekly(mysteryBoxId);
    }

    @GetMapping("me")
    public LeaderboardMeView me(@RequestParam(required = false) String mysteryBoxId) {
        return drawLeaderboardService.me(StpUtil.getLoginIdAsString(), mysteryBoxId);
    }

    @GetMapping
    public DrawLeaderboardService.LeaderboardPageView page(
            @RequestParam(required = false) String mysteryBoxId,
            @RequestParam(defaultValue = "week") String period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return drawLeaderboardService.page(mysteryBoxId, period, page, size);
    }
}

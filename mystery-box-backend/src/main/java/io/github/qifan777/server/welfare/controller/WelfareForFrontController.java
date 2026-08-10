package io.github.qifan777.server.welfare.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.welfare.model.CheckInStatusView;
import io.github.qifan777.server.welfare.service.WelfareService;
import lombok.AllArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/welfare")
@AllArgsConstructor
@Transactional
public class WelfareForFrontController {
    private final WelfareService welfareService;

    @GetMapping("check-in/status")
    public CheckInStatusView checkInStatus() {
        return welfareService.checkInStatus(StpUtil.getLoginIdAsString());
    }

    @PostMapping("check-in")
    public CheckInStatusView checkIn() {
        return welfareService.checkIn(StpUtil.getLoginIdAsString());
    }

    @GetMapping("favorites")
    public List<String> favorites() {
        return welfareService.listFavoriteBoxIds(StpUtil.getLoginIdAsString());
    }

    @PostMapping("favorites/{mysteryBoxId}/toggle")
    public Boolean toggleFavorite(@PathVariable String mysteryBoxId) {
        return welfareService.toggleFavorite(StpUtil.getLoginIdAsString(), mysteryBoxId);
    }
}

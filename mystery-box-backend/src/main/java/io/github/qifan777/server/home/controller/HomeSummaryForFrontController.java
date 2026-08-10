package io.github.qifan777.server.home.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.home.model.HomeSummaryView;
import io.github.qifan777.server.home.service.HomeSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/home")
@RequiredArgsConstructor
public class HomeSummaryForFrontController {
    private final HomeSummaryService homeSummaryService;

    @SaIgnore
    @GetMapping("summary")
    public HomeSummaryView summary() {
        return homeSummaryService.summary(StpUtil.getLoginIdDefaultNull());
    }

    @SaIgnore
    @GetMapping("recommend")
    public List<String> recommend() {
        return homeSummaryService.recommend(StpUtil.getLoginIdDefaultNull());
    }
}

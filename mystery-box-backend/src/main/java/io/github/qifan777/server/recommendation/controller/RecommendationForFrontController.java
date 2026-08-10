package io.github.qifan777.server.recommendation.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/recommendation")
@RequiredArgsConstructor
@DefaultFetcherOwner(MysteryBoxRepository.class)
public class RecommendationForFrontController {
    private final RecommendationService recommendationService;
    private final MysteryBoxRepository mysteryBoxRepository;

    @GetMapping("mystery-box")
    public List<@FetchBy("COMPLEX_FETCHER_FOR_FRONT") MysteryBox> recommendMysteryBoxes(
            @RequestParam(defaultValue = "8") int limit,
            @RequestParam(required = false) String variant
    ) {
        String userId = String.valueOf(StpUtil.getLoginIdDefaultNull());
        String useVariant = (variant == null || variant.isBlank()) ? recommendationService.variantForUser(userId) : variant;
        List<String> boxIds = recommendationService.recommendBoxIds(userId, limit, useVariant);
        return mysteryBoxRepository.findByIds(boxIds, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @GetMapping("debug")
    @SaCheckRole("管理员")
    public Map<String, Object> debugRecommendation() {
        String userId = String.valueOf(StpUtil.getLoginIdDefaultNull());
        return recommendationService.debugFeatures(userId);
    }
}

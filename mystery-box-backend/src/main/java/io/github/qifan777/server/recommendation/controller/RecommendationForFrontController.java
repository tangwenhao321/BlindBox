package io.github.qifan777.server.recommendation.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.recommendation.service.RecommendationService;
import io.github.qifan777.server.recommendation.service.RecommendationService.RecommendationResult;
import lombok.RequiredArgsConstructor;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Front recommendation APIs.
 * <p>
 * Clients should include {@code variant} when tracking {@code RECOMMEND_IMPRESSION}
 * / {@code RECOMMEND_CLICK} so A/B results are attributable.
 */
@RestController
@RequestMapping("front/recommendation")
@RequiredArgsConstructor
@DefaultFetcherOwner(MysteryBoxRepository.class)
public class RecommendationForFrontController {
    private final RecommendationService recommendationService;
    private final MysteryBoxRepository mysteryBoxRepository;

    @GetMapping("mystery-box")
    public Map<String, Object> recommendMysteryBoxes(
            @RequestParam(defaultValue = "8") int limit,
            @RequestParam(required = false) String variant
    ) {
        String userId = String.valueOf(StpUtil.getLoginIdDefaultNull());
        RecommendationResult recommendation = recommendationService.recommend(userId, limit, variant);
        List<MysteryBox> items = mysteryBoxRepository.findByIds(
                recommendation.boxIds(),
                MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT
        );
        return Map.of(
                "variant", recommendation.variant(),
                "items", items
        );
    }

    @GetMapping("debug")
    @SaCheckRole("管理员")
    public Map<String, Object> debugRecommendation() {
        String userId = String.valueOf(StpUtil.getLoginIdDefaultNull());
        return recommendationService.debugFeatures(userId);
    }
}

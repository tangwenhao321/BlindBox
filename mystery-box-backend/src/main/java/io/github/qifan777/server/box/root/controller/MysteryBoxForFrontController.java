package io.github.qifan777.server.box.root.controller;

import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxSpec;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.root.model.MysteryBoxInsightView;
import io.github.qifan777.server.box.draw.model.DrawFeedItemView;
import io.github.qifan777.server.box.draw.model.DrawFeedPageView;
import io.github.qifan777.server.box.draw.service.MysteryBoxDrawFeedService;
import io.github.qifan777.server.box.root.service.MysteryBoxProbabilityHistoryService;
import io.github.qifan777.server.box.root.model.MysteryBoxProbabilityView;
import io.github.qifan777.server.box.root.service.MysteryBoxInsightService;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.root.model.PoolDashboardView;
import io.github.qifan777.server.box.root.model.TrustMetaView;
import io.github.qifan777.server.box.root.service.PoolDashboardService;
import io.github.qifan777.server.box.root.service.TrustMetaService;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/mystery-box")
@AllArgsConstructor
@DefaultFetcherOwner(MysteryBoxRepository.class)
@Transactional
public class MysteryBoxForFrontController {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final NewcomerBoxService newcomerBoxService;
    private final MysteryBoxInsightService mysteryBoxInsightService;
    private final MysteryBoxDrawFeedService mysteryBoxDrawFeedService;
    private final MysteryBoxUserPityService mysteryBoxUserPityService;
    private final MysteryBoxProbabilityHistoryService mysteryBoxProbabilityHistoryService;
    private final PoolDashboardService poolDashboardService;
    private final TrustMetaService trustMetaService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBox findById(@PathVariable String id) {
        return mysteryBoxRepository.findById(id, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBox> query(@RequestBody QueryRequest<MysteryBoxSpec> queryRequest) {
        return mysteryBoxRepository.findPage(queryRequest, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    /** 搜索别名，与 query 行为一致，便于客户端统一使用 /search */
    @PostMapping("search")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBox> search(@RequestBody QueryRequest<MysteryBoxSpec> queryRequest) {
        return query(queryRequest);
    }

    @GetMapping("newcomer-offer")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBox newcomerOffer() {
        return newcomerBoxService.getNewcomerOfferBox();
    }

    @SaIgnore
    @GetMapping("{id}/pool-dashboard")
    public PoolDashboardView poolDashboard(@PathVariable String id) {
        return poolDashboardService.dashboard(id);
    }

    @SaIgnore
    @GetMapping("{id}/trust-meta")
    public TrustMetaView trustMeta(@PathVariable String id) {
        return trustMetaService.meta(id);
    }

    @SaIgnore
    @GetMapping("{id}/insight")
    public MysteryBoxInsightView insight(@PathVariable String id) {
        String userId = StpUtil.isLogin() ? StpUtil.getLoginIdAsString() : null;
        return mysteryBoxInsightService.insight(id, userId);
    }

    @SaIgnore
    @GetMapping("{id}/draw-feed")
    public DrawFeedPageView drawFeed(@PathVariable String id,
                                     @RequestParam(defaultValue = "20") int limit,
                                     @RequestParam(required = false) String cursor) {
        return mysteryBoxDrawFeedService.feedPage(id, limit, cursor);
    }

    @GetMapping("draw-feed")
    public DrawFeedPageView globalDrawFeed(@RequestParam(defaultValue = "20") int limit,
                                           @RequestParam(required = false) String cursor) {
        return mysteryBoxDrawFeedService.feedPage(null, limit, cursor);
    }

    @GetMapping("{id}/pity-progress")
    public MysteryBoxUserPityService.PityProgressView pityProgress(@PathVariable String id) {
        return mysteryBoxUserPityService.progress(StpUtil.getLoginIdAsString(), id);
    }

    @SaIgnore
    @GetMapping("{id}/probability")
    public MysteryBoxProbabilityView probability(@PathVariable String id) {
        MysteryBox box = mysteryBoxRepository.findById(id, MysteryBoxRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        return new MysteryBoxProbabilityView(
                box.legendaryRate(),
                box.hiddenRate(),
                box.generalRate(),
                box.editedTime()
        );
    }

    @GetMapping("{id}/probability/history")
    public List<MysteryBoxProbabilityHistoryService.ProbabilityHistoryView> probabilityHistory(
            @PathVariable String id,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return mysteryBoxProbabilityHistoryService.list(id, limit);
    }

}

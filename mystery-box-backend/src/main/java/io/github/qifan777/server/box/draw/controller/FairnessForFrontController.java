package io.github.qifan777.server.box.draw.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.OrderDrawMetaService;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLog;
import io.github.qifan777.server.box.draw.repository.MysteryBoxDrawLogRepository;
import io.github.qifan777.server.box.draw.service.DrawFairnessService;
import io.github.qifan777.server.box.draw.service.SeriesDrawStatisticsService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("front/fairness")
@RequiredArgsConstructor
public class FairnessForFrontController {
    private final MysteryBoxDrawLogRepository mysteryBoxDrawLogRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final OrderDrawMetaService orderDrawMetaService;
    private final DrawFairnessService drawFairnessService;
    private final SeriesDrawStatisticsService seriesDrawStatisticsService;
    private final OrderIdLookupService orderIdLookupService;

    @SaIgnore
    @GetMapping("series/{mysteryBoxId}/draw-statistics")
    public SeriesDrawStatisticsService.SeriesDrawStatisticsView seriesDrawStatistics(@PathVariable String mysteryBoxId) {
        return seriesDrawStatisticsService.statistics(mysteryBoxId);
    }

    @GetMapping("draw-log/{id}")
    public FairnessVerifyView verify(@PathVariable String id) {
        MysteryBoxDrawLog log = mysteryBoxDrawLogRepository.findById(id)
                .orElseThrow(() -> new BusinessException("开奖记录不存在"));
        assertOwner(log.userId());
        return toView(log);
    }

    @GetMapping("order/{orderId}")
    public List<FairnessVerifyView> verifyByOrder(@PathVariable String orderId) {
        String resolved = orderIdLookupService.resolveCurrentId(orderId);
        List<MysteryBoxDrawLog> logs = mysteryBoxDrawLogRepository.findByOrderId(resolved);
        if (logs.isEmpty()) {
            return List.of();
        }
        assertOwner(logs.get(0).userId());
        for (MysteryBoxDrawLog log : logs) {
            assertOwner(log.userId());
        }
        return logs.stream().map(this::toView).toList();
    }

    /**
     * Pre-reveal commit: sha256(seed). Seed itself is not returned until draw logs exist.
     */
    @GetMapping("order/{orderId}/commit")
    public FairnessCommitView commitByOrder(@PathVariable String orderId) {
        String resolved = orderIdLookupService.resolveCurrentId(orderId);
        MysteryBoxOrder order = mysteryBoxOrderRepository.findById(resolved, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("订单不存在"));
        assertOwner(order.creator().id());
        String commit = orderDrawMetaService.getFairnessCommit(resolved);
        if (commit == null || commit.isBlank()) {
            String seed = orderDrawMetaService.getFairnessSeed(resolved);
            commit = drawFairnessService.commitOf(seed);
            if (commit != null && seed != null) {
                orderDrawMetaService.saveFairnessSeed(resolved, seed, commit);
            }
        }
        if (commit == null || commit.isBlank()) {
            throw new BusinessException("公平性承诺尚未生成");
        }
        boolean revealed = !mysteryBoxDrawLogRepository.findByOrderId(resolved).isEmpty();
        boolean clientNonceBound = commit != null && seedBoundCommit(resolved, commit);
        return new FairnessCommitView(resolved, commit, revealed, clientNonceBound);
    }

    private boolean seedBoundCommit(String orderId, String commit) {
        String seed = orderDrawMetaService.getFairnessSeed(orderId);
        if (seed == null) {
            return false;
        }
        // If commit != sha256(seed), a client nonce was mixed in.
        String seedOnly = drawFairnessService.commitOf(seed);
        return seedOnly != null && !seedOnly.equalsIgnoreCase(commit);
    }

    private void assertOwner(String userId) {
        if (userId == null || !userId.equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException("无权查看该开奖验签");
        }
    }

    private FairnessVerifyView toView(MysteryBoxDrawLog log) {
        boolean verified = drawFairnessService.verify(
                log.fairnessSeed(),
                log.fairnessHash(),
                log.userId(),
                log.mysteryBoxId(),
                log.mysteryBoxOrderId(),
                log.productId(),
                log.createdTime()
        );
        return new FairnessVerifyView(
                log.id(),
                log.mysteryBoxOrderId(),
                log.productId(),
                log.productName(),
                log.qualityType(),
                log.fairnessSeed(),
                log.fairnessHash(),
                log.createdTime(),
                verified
        );
    }

    public record FairnessVerifyView(
            String drawLogId,
            String orderId,
            String productId,
            String productName,
            String qualityType,
            String fairnessSeed,
            String fairnessHash,
            java.time.LocalDateTime createdTime,
            boolean verified
    ) {
    }

    public record FairnessCommitView(
            String orderId,
            String fairnessCommit,
            boolean revealed,
            boolean clientNonceBound
    ) {
    }
}

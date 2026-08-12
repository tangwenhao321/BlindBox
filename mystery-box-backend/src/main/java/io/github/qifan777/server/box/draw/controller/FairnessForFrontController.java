package io.github.qifan777.server.box.draw.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.order.OrderIdLookupService;
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
}

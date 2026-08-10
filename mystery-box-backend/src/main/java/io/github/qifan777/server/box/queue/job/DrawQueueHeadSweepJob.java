package io.github.qifan777.server.box.queue.job;

import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DrawQueueHeadSweepJob {
    private static final String QUEUE_KEY_PREFIX = "mystery-box:draw-queue:";

    private final StringRedisTemplate redisTemplate;
    private final MysteryBoxDrawQueueService drawQueueService;
    private final JobRunAuditService jobRunAuditService;

    @Scheduled(fixedRate = 30_000)
    @SchedulerLock(name = "DrawQueueHeadSweepJob", lockAtLeastFor = "PT10S", lockAtMostFor = "PT2M")
    public void sweepStaleHeads() {
        jobRunAuditService.runWithAudit("DrawQueueHeadSweepJob", () -> {
            ScanOptions options = ScanOptions.scanOptions().match(QUEUE_KEY_PREFIX + "*").count(100).build();
            try (Cursor<String> cursor = redisTemplate.scan(options)) {
                while (cursor.hasNext()) {
                    String queueKey = cursor.next();
                    String mysteryBoxId = queueKey.substring(QUEUE_KEY_PREFIX.length());
                    if (drawQueueService.evictStaleHeadIfExpired(mysteryBoxId)) {
                        log.info("Evicted stale queue head mysteryBoxId={}", mysteryBoxId);
                    }
                }
            }
        });
    }
}

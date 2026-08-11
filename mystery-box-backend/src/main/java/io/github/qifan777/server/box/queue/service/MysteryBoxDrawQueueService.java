package io.github.qifan777.server.box.queue.service;

import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class MysteryBoxDrawQueueService {
    /** Average seconds per draw turn for wait estimation. */
    private static final int AVG_DRAW_SECONDS = 90;

    private final StringRedisTemplate redisTemplate;
    private final DrawQueueTurnNotifier drawQueueTurnNotifier;

    @Value("${app.queue.head-timeout-sec:120}")
    private int headTimeoutSec;

    @Value("${app.queue.ttl-hours:2}")
    private int queueTtlHours;

    @Value("${app.queue.lock-ttl-sec:120}")
    private int lockTtlSec;

    public void acquireBuyoutLock(String mysteryBoxId, String userId) {
        String key = lockKey(mysteryBoxId);
        Boolean ok = redisTemplate.opsForValue().setIfAbsent(key, userId, lockTtl());
        if (Boolean.FALSE.equals(ok)) {
            String holder = redisTemplate.opsForValue().get(key);
            if (!userId.equals(holder)) {
                throw new BusinessException("当前奖池正在被其他用户全收锁定，请稍后再试");
            }
            renewBuyoutLock(mysteryBoxId, userId);
        }
    }

    public void renewBuyoutLock(String mysteryBoxId, String userId) {
        String key = lockKey(mysteryBoxId);
        String holder = redisTemplate.opsForValue().get(key);
        if (holder == null) {
            return;
        }
        if (!userId.equals(holder)) {
            throw new BusinessException("全收锁池不属于当前用户");
        }
        redisTemplate.expire(key, lockTtl());
    }

    public void releaseBuyoutLock(String mysteryBoxId, String userId) {
        String key = lockKey(mysteryBoxId);
        String holder = redisTemplate.opsForValue().get(key);
        if (userId.equals(holder)) {
            redisTemplate.delete(key);
        }
    }

    public void assertBuyoutLock(String mysteryBoxId, String userId) {
        String holder = redisTemplate.opsForValue().get(lockKey(mysteryBoxId));
        // Fail closed: expired/missing Redis lock must not allow payment to proceed.
        if (holder == null || !holder.equals(userId)) {
            throw new BusinessException("全收锁池不属于当前用户，请重新获取锁");
        }
    }

    public BuyoutLockView buyoutLockStatus(String mysteryBoxId) {
        String key = lockKey(mysteryBoxId);
        String holder = redisTemplate.opsForValue().get(key);
        Long ttl = holder == null ? null : redisTemplate.getExpire(key);
        return new BuyoutLockView(holder, ttl == null || ttl < 0 ? 0 : ttl.intValue());
    }

    public QueueStatus joinQueue(String mysteryBoxId) {
        String userId = StpUtil.getLoginIdAsString();
        String queueKey = queueKey(mysteryBoxId);
        redisTemplate.opsForZSet().add(queueKey, userId, System.currentTimeMillis());
        redisTemplate.expire(queueKey, queueTtl());
        Long size = redisTemplate.opsForZSet().zCard(queueKey);
        if (size != null && size == 1) {
            recordHeadSince(mysteryBoxId);
        }
        return status(mysteryBoxId, userId);
    }

    public QueueStatus status(String mysteryBoxId, String userId) {
        evictStaleHeadIfExpired(mysteryBoxId);
        touchQueueTtlIfMember(mysteryBoxId, userId);
        String queueKey = queueKey(mysteryBoxId);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId);
        long position = rank == null ? -1 : rank + 1;
        Long size = redisTemplate.opsForZSet().zCard(queueKey);
        boolean canDraw = position == 1;
        Long queueTtl = redisTemplate.getExpire(queueKey);
        BuyoutLockView lock = buyoutLockStatus(mysteryBoxId);
        boolean lockHeldByMe = lock.holderUserId() != null && lock.holderUserId().equals(userId);
        return buildQueueStatus(position, size, canDraw, lock, queueTtl, lockHeldByMe, mysteryBoxId);
    }

    public QueueStatus renewQueue(String mysteryBoxId, String userId) {
        touchQueueTtlIfMember(mysteryBoxId, userId);
        String queueKey = queueKey(mysteryBoxId);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId);
        if (rank != null && rank == 0) {
            recordHeadSince(mysteryBoxId);
        }
        String holder = redisTemplate.opsForValue().get(lockKey(mysteryBoxId));
        if (userId.equals(holder)) {
            redisTemplate.expire(lockKey(mysteryBoxId), lockTtl());
        }
        return statusWithoutRenew(mysteryBoxId, userId);
    }

    public boolean evictStaleHeadIfExpired(String mysteryBoxId) {
        String queueKey = queueKey(mysteryBoxId);
        var first = redisTemplate.opsForZSet().range(queueKey, 0, 0);
        if (first == null || first.isEmpty()) {
            clearHeadSince(mysteryBoxId);
            return false;
        }
        Long since = headSinceMs(mysteryBoxId);
        if (since == null) {
            recordHeadSince(mysteryBoxId);
            return false;
        }
        long elapsedSec = (System.currentTimeMillis() - since) / 1000;
        if (elapsedSec < headTimeoutSec) {
            return false;
        }
        String headUserId = first.iterator().next();
        redisTemplate.opsForZSet().remove(queueKey, headUserId);
        Long remaining = redisTemplate.opsForZSet().zCard(queueKey);
        if (remaining == null || remaining == 0) {
            clearHeadSince(mysteryBoxId);
        } else {
            recordHeadSince(mysteryBoxId);
            drawQueueTurnNotifier.notifyNextIfReady(mysteryBoxId);
        }
        return true;
    }

    private void touchQueueTtlIfMember(String mysteryBoxId, String userId) {
        String queueKey = queueKey(mysteryBoxId);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId);
        if (rank != null) {
            redisTemplate.expire(queueKey, queueTtl());
        }
    }

    private QueueStatus statusWithoutRenew(String mysteryBoxId, String userId) {
        String queueKey = queueKey(mysteryBoxId);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId);
        long position = rank == null ? -1 : rank + 1;
        Long size = redisTemplate.opsForZSet().zCard(queueKey);
        boolean canDraw = position == 1;
        Long queueTtl = redisTemplate.getExpire(queueKey);
        BuyoutLockView lock = buyoutLockStatus(mysteryBoxId);
        boolean lockHeldByMe = lock.holderUserId() != null && lock.holderUserId().equals(userId);
        return buildQueueStatus(position, size, canDraw, lock, queueTtl, lockHeldByMe, mysteryBoxId);
    }

    private QueueStatus buildQueueStatus(
            long position,
            Long size,
            boolean canDraw,
            BuyoutLockView lock,
            Long queueTtl,
            boolean lockHeldByMe,
            String mysteryBoxId
    ) {
        int queueSize = size == null ? 0 : size.intValue();
        long ahead = position <= 0 ? queueSize : Math.max(position - 1, 0);
        int estimatedWaitSec = (int) Math.min(Integer.MAX_VALUE, ahead * AVG_DRAW_SECONDS);
        int headExpiresInSeconds = position == 1 ? headExpiresInSeconds(mysteryBoxId) : 0;
        return new QueueStatus(
                position,
                queueSize,
                queueSize,
                estimatedWaitSec,
                canDraw,
                lock.lockTtlSeconds(),
                lock.holderUserId(),
                queueTtl == null || queueTtl < 0 ? 0 : queueTtl.intValue(),
                lockHeldByMe,
                headTimeoutSec,
                headExpiresInSeconds
        );
    }

    private int headExpiresInSeconds(String mysteryBoxId) {
        Long since = headSinceMs(mysteryBoxId);
        if (since == null) {
            recordHeadSince(mysteryBoxId);
            since = System.currentTimeMillis();
        }
        long elapsedSec = (System.currentTimeMillis() - since) / 1000;
        return (int) Math.max(0, headTimeoutSec - elapsedSec);
    }

    private void recordHeadSince(String mysteryBoxId) {
        redisTemplate.opsForValue().set(
                headSinceKey(mysteryBoxId),
                String.valueOf(System.currentTimeMillis()),
                queueTtl()
        );
    }

    private void clearHeadSince(String mysteryBoxId) {
        redisTemplate.delete(headSinceKey(mysteryBoxId));
    }

    private Long headSinceMs(String mysteryBoxId) {
        String value = redisTemplate.opsForValue().get(headSinceKey(mysteryBoxId));
        if (value == null || value.isBlank()) {
            return null;
        }
        return Long.parseLong(value);
    }

    public void leaveQueue(String mysteryBoxId) {
        leaveQueueForUser(mysteryBoxId, StpUtil.getLoginIdAsString());
    }

    public void leaveQueueForUser(String mysteryBoxId, String userId) {
        String queueKey = queueKey(mysteryBoxId);
        Long rank = redisTemplate.opsForZSet().rank(queueKey, userId);
        boolean wasHead = rank != null && rank == 0;
        redisTemplate.opsForZSet().remove(queueKey, userId);
        Long remaining = redisTemplate.opsForZSet().zCard(queueKey);
        if (remaining == null || remaining == 0) {
            clearHeadSince(mysteryBoxId);
        } else if (wasHead) {
            recordHeadSince(mysteryBoxId);
            drawQueueTurnNotifier.notifyNextIfReady(mysteryBoxId);
        }
    }

    public void assertCanDrawInQueue(String mysteryBoxId, String drawMode) {
        if (!"queue".equalsIgnoreCase(drawMode)) {
            return;
        }
        QueueStatus status = status(mysteryBoxId, StpUtil.getLoginIdAsString());
        if (!status.canDraw()) {
            throw new BusinessException("排队中，当前排位第 " + Math.max(status.position(), 1) + "，请等待");
        }
    }

    private Duration lockTtl() {
        return Duration.ofSeconds(lockTtlSec);
    }

    private Duration queueTtl() {
        return Duration.ofHours(queueTtlHours);
    }

    private static String lockKey(String mysteryBoxId) {
        return "mystery-box:buyout-lock:" + mysteryBoxId;
    }

    private static String queueKey(String mysteryBoxId) {
        return "mystery-box:draw-queue:" + mysteryBoxId;
    }

    private static String headSinceKey(String mysteryBoxId) {
        return "mystery-box:queue-head-since:" + mysteryBoxId;
    }

    public record BuyoutLockView(String holderUserId, int lockTtlSeconds) {
    }

    public record QueueStatus(
            long position,
            int total,
            int queueSize,
            int estimatedWaitSec,
            boolean canDraw,
            int lockTtlSeconds,
            String lockHolderUserId,
            int queueExpiresInSeconds,
            boolean lockHeldByMe,
            int headTimeoutSec,
            int headExpiresInSeconds
    ) {
    }
}

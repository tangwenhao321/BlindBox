package io.github.qifan777.server.box.win.repository;

import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLogFetcher;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinHitLogTable;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

public interface MysteryBoxWinHitLogRepository extends JRepository<MysteryBoxWinHitLog, String> {
    MysteryBoxWinHitLogTable t = MysteryBoxWinHitLogTable.$;

    MysteryBoxWinHitLogFetcher SIMPLE_FETCHER = MysteryBoxWinHitLogFetcher.$.allScalarFields();

    default List<MysteryBoxWinHitLog> findLatest(int limit) {
        return sql().createQuery(t)
                .orderBy(t.createdTime().desc())
                .select(t.fetch(SIMPLE_FETCHER))
                .limit(limit)
                .execute();
    }

    default List<MysteryBoxWinHitLog> findLatestWithFilters(int limit,
                                                            String userId,
                                                            String mysteryBoxOrderId,
                                                            LocalDateTime createdTimeStart,
                                                            LocalDateTime createdTimeEnd) {
        return sql().createQuery(t)
                .whereIf(StringUtils.hasText(userId), t.userId().eq(userId))
                .whereIf(StringUtils.hasText(mysteryBoxOrderId), t.mysteryBoxOrderId().eq(mysteryBoxOrderId))
                .whereIf(createdTimeStart != null, t.createdTime().ge(createdTimeStart))
                .whereIf(createdTimeEnd != null, t.createdTime().le(createdTimeEnd))
                .orderBy(t.createdTime().desc())
                .select(t.fetch(SIMPLE_FETCHER))
                .limit(limit)
                .execute();
    }
}

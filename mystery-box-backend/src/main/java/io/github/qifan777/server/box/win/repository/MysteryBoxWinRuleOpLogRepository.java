package io.github.qifan777.server.box.win.repository;

import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLogFetcher;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLogTable;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

public interface MysteryBoxWinRuleOpLogRepository extends JRepository<MysteryBoxWinRuleOpLog, String> {
    MysteryBoxWinRuleOpLogTable t = MysteryBoxWinRuleOpLogTable.$;
    MysteryBoxWinRuleOpLogFetcher SIMPLE_FETCHER = MysteryBoxWinRuleOpLogFetcher.$.allScalarFields();

    default List<MysteryBoxWinRuleOpLog> findLatest(int limit) {
        return findLatestWithFilters(limit, null, null, null, null, null);
    }

    default List<MysteryBoxWinRuleOpLog> findLatestWithFilters(int limit,
                                                               String ruleId,
                                                               String action,
                                                               String operatorId,
                                                               LocalDateTime createdTimeStart,
                                                               LocalDateTime createdTimeEnd) {
        int safeLimit = Math.min(Math.max(limit, 1), 500);
        return sql().createQuery(t)
                .whereIf(StringUtils.hasText(ruleId), t.ruleId().eq(ruleId))
                .whereIf(StringUtils.hasText(action), t.action().eq(action))
                .whereIf(StringUtils.hasText(operatorId), t.operatorId().eq(operatorId))
                .whereIf(createdTimeStart != null, t.createdTime().ge(createdTimeStart))
                .whereIf(createdTimeEnd != null, t.createdTime().le(createdTimeEnd))
                .orderBy(t.createdTime().desc())
                .select(t.fetch(SIMPLE_FETCHER))
                .limit(safeLimit)
                .execute();
    }
}


package io.github.qifan777.server.box.win.repository;

import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLog;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLogFetcher;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleOpLogTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.List;

public interface MysteryBoxWinRuleOpLogRepository extends JRepository<MysteryBoxWinRuleOpLog, String> {
    MysteryBoxWinRuleOpLogTable t = MysteryBoxWinRuleOpLogTable.$;
    MysteryBoxWinRuleOpLogFetcher SIMPLE_FETCHER = MysteryBoxWinRuleOpLogFetcher.$.allScalarFields();

    default List<MysteryBoxWinRuleOpLog> findLatest(int limit) {
        return sql().createQuery(t)
                .orderBy(t.createdTime().desc())
                .select(t.fetch(SIMPLE_FETCHER))
                .limit(Math.min(Math.max(limit, 1), 500))
                .execute();
    }
}


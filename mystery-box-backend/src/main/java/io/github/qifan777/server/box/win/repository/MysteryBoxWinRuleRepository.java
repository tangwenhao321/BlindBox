package io.github.qifan777.server.box.win.repository;

import io.github.qifan777.server.box.win.entity.MysteryBoxWinRule;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleFetcher;
import io.github.qifan777.server.box.win.entity.MysteryBoxWinRuleTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.Optional;

public interface MysteryBoxWinRuleRepository extends JRepository<MysteryBoxWinRule, String> {
    MysteryBoxWinRuleTable t = MysteryBoxWinRuleTable.$;

    MysteryBoxWinRuleFetcher SIMPLE_FETCHER = MysteryBoxWinRuleFetcher.$.allScalarFields();

    default Optional<MysteryBoxWinRule> findFirstActiveRule(String userId, String mysteryBoxId) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId))
                .where(t.mysteryBoxId().eq(mysteryBoxId))
                .where(t.enabled().eq(true))
                .where(t.approved().eq(true))
                .where(t.remainingCount().gt(0))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(SIMPLE_FETCHER))
                .fetchOptional();
    }

    default void consumeOne(String id, int remainingCount) {
        consumeOneAtomic(id);
    }

    /** Atomic: remaining_count = remaining_count - 1 WHERE remaining_count > 0. */
    default boolean consumeOneAtomic(String id) {
        int updated = sql().createUpdate(t)
                .where(t.id().eq(id))
                .where(t.remainingCount().gt(0))
                .set(t.remainingCount(), t.remainingCount().minus(1))
                .execute();
        return updated > 0;
    }
}

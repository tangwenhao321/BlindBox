package io.github.qifan777.server.user.root.repository;

import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogFetcher;
import io.github.qifan777.server.user.root.entity.UserBalanceLogTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.List;
import java.util.Optional;

public interface UserBalanceLogRepository extends JRepository<UserBalanceLog, String> {
    UserBalanceLogTable t = UserBalanceLogTable.$;
    UserBalanceLogFetcher SIMPLE_FETCHER = UserBalanceLogFetcher.$.allScalarFields();

    default List<UserBalanceLog> findLatestByUser(String userId, int limit) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId))
                .orderBy(t.createdTime().desc())
                .select(t.fetch(SIMPLE_FETCHER))
                .limit(limit)
                .execute();
    }

    default Optional<UserBalanceLog> findByUserChangeTypeRef(String userId, String changeType, String refId) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId))
                .where(t.changeType().eq(changeType))
                .where(t.relatedOrderId().eq(refId))
                .select(t.fetch(SIMPLE_FETCHER))
                .fetchOptional();
    }

    default List<UserBalanceLog> findAllByUserOrdered(String userId) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(SIMPLE_FETCHER))
                .execute();
    }
}

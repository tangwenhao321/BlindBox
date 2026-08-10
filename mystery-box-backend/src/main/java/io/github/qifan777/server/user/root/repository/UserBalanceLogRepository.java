package io.github.qifan777.server.user.root.repository;

import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserBalanceLogFetcher;
import io.github.qifan777.server.user.root.entity.UserBalanceLogTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.List;

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
}

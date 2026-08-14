package io.github.qifan777.server.user.root.repository;

import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.role.entity.RoleFetcher;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import io.github.qifan777.server.user.root.entity.UserTable;
import io.github.qifan777.server.user.root.entity.dto.UserSpec;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface UserRepository extends JRepository<User, String> {

    UserTable userTable = UserTable.$;
    /** Admin list/detail — never expose password hash. */
    UserFetcher COMPLEX_FETCHER_FOR_ADMIN = UserFetcher.$.allScalarFields().password(false);
    UserFetcher COMPLEX_FETCHER_FOR_FRONT = UserFetcher.$.allScalarFields().password(false);
    /** API profile responses — roles without password. */
    UserFetcher USER_ROLE_FETCHER = UserFetcher.$.allScalarFields().password(false).rolesView(RoleFetcher.$.name());
    /** Internal login only — includes password for BCrypt check. */
    UserFetcher LOGIN_FETCHER = UserFetcher.$.allScalarFields().rolesView(RoleFetcher.$.name());

    default Page<User> findPage(QueryRequest<UserSpec> queryRequest, Fetcher<User> fetcher) {
        UserSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(userTable)
                .where(query)
                .orderBy(SpringOrders.toOrders(userTable, pageable.getSort()))
                .select(userTable.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    default void addBalance(String userId, BigDecimal amount) {
        sql().createUpdate(userTable)
                .where(userTable.id().eq(userId))
                .set(userTable.balance(), userTable.balance().plus(amount))
                .execute();
    }
}
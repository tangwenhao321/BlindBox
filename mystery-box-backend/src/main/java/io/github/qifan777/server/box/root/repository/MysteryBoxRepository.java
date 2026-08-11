package io.github.qifan777.server.box.root.repository;

import io.github.qifan777.server.box.category.entity.MysteryBoxCategoryFetcher;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxFetcher;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxSpec;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.ast.Expression;
import org.babyfish.jimmer.sql.ast.Predicate;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MysteryBoxRepository extends JRepository<MysteryBox, String> {
    MysteryBoxTable t = MysteryBoxTable.$;
    MysteryBoxFetcher COMPLEX_FETCHER_FOR_ADMIN = MysteryBoxFetcher.$
            .allScalarFields()
            .products(ProductRepository.COMPLEX_FETCHER_FOR_ADMIN)
            .category(MysteryBoxCategoryFetcher.$.name())
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname());
    MysteryBoxFetcher COMPLEX_FETCHER_FOR_FRONT = MysteryBoxFetcher.$.allScalarFields()
            .products(ProductRepository.COMPLEX_FETCHER_FOR_FRONT)
            .creator(true);

    default Page<MysteryBox> findPage(QueryRequest<MysteryBoxSpec> queryRequest,
                                      Fetcher<MysteryBox> fetcher) {
        MysteryBoxSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    /**
     * Atomically decrement pool. {@code pool_total == 0} means unlimited (same as {@link #assertPoolAvailable}).
     */
    default void consumePool(String id, int count) {
        if (count <= 0) {
            return;
        }
        int updated = sql().createUpdate(t)
                .where(t.id().eq(id))
                .where(Predicate.or(t.poolTotal().eq(0), t.poolRemaining().ge(count)))
                .set(t.poolRemaining(), t.poolRemaining().minus(count))
                .execute();
        if (updated == 0) {
            MysteryBox box = findById(id).orElseThrow(() -> new BusinessException("盲盒不存在"));
            throw new BusinessException("奖池余量不足，剩余 " + box.poolRemaining() + " 张");
        }
    }

    /**
     * Atomically restore pool units, capped at {@code pool_total} when limited.
     */
    default void restorePool(String id, int count) {
        if (count <= 0) {
            return;
        }
        int updated = sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(
                        t.poolRemaining(),
                        Expression.numeric().sql(
                                Integer.class,
                                "CASE WHEN %e = 0 THEN %e + %v ELSE LEAST(%e + %v, %e) END",
                                it -> it
                                        .expression(t.poolTotal())
                                        .expression(t.poolRemaining())
                                        .value(count)
                                        .expression(t.poolRemaining())
                                        .value(count)
                                        .expression(t.poolTotal())
                        )
                )
                .execute();
        if (updated == 0) {
            throw new BusinessException("盲盒不存在");
        }
    }

    default void assertPoolAvailable(String id, int count) {
        MysteryBox box = findById(id).orElseThrow(() -> new BusinessException("盲盒不存在"));
        int remaining = box.poolRemaining();
        int total = box.poolTotal();
        if (total > 0 && remaining < count) {
            throw new BusinessException("奖池余量不足，剩余 " + remaining + " 张");
        }
    }
}
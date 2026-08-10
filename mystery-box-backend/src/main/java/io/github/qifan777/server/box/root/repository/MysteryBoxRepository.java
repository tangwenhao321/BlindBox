package io.github.qifan777.server.box.root.repository;

import io.github.qifan777.server.box.category.entity.MysteryBoxCategoryFetcher;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxFetcher;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxSpec;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
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

    default void consumePool(String id, int count) {
        if (count <= 0) {
            return;
        }
        MysteryBox box = findById(id)
                .orElseThrow(() -> new io.qifan.infrastructure.common.exception.BusinessException("盲盒不存在"));
        int next = Math.max(box.poolRemaining() - count, 0);
        sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(t.poolRemaining(), next)
                .execute();
    }

    default void restorePool(String id, int count) {
        if (count <= 0) {
            return;
        }
        MysteryBox box = findById(id)
                .orElseThrow(() -> new io.qifan.infrastructure.common.exception.BusinessException("盲盒不存在"));
        int total = box.poolTotal();
        int next = box.poolRemaining() + count;
        if (total > 0) {
            next = Math.min(next, total);
        }
        sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(t.poolRemaining(), next)
                .execute();
    }

    default void assertPoolAvailable(String id, int count) {
        MysteryBox box = findById(id).orElseThrow(() -> new io.qifan.infrastructure.common.exception.BusinessException("盲盒不存在"));
        int remaining = box.poolRemaining();
        int total = box.poolTotal();
        if (total > 0 && remaining < count) {
            throw new io.qifan.infrastructure.common.exception.BusinessException("奖池余量不足，剩余 " + remaining + " 张");
        }
    }
}
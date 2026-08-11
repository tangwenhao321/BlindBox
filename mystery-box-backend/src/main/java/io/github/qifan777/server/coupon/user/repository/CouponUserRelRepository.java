package io.github.qifan777.server.coupon.user.repository;

import io.github.qifan777.server.Fetchers;
import io.github.qifan777.server.coupon.user.entity.CouponUserRel;
import io.github.qifan777.server.coupon.user.entity.CouponUserRelFetcher;
import io.github.qifan777.server.coupon.user.entity.CouponUserRelTable;
import io.github.qifan777.server.coupon.user.entity.dto.CouponUserRelSpec;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

public interface CouponUserRelRepository extends JRepository<CouponUserRel, String> {
    CouponUserRelTable t = CouponUserRelTable.$;
    CouponUserRelFetcher COMPLEX_FETCHER_FOR_ADMIN = CouponUserRelFetcher.$.allScalarFields()
            .coupon(Fetchers.COUPON_FETCHER.allScalarFields())
            .user(UserFetcher.$.phone().nickname())
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname());
    CouponUserRelFetcher COMPLEX_FETCHER_FOR_FRONT = CouponUserRelFetcher.$.allScalarFields()
            .coupon(Fetchers.COUPON_FETCHER.allScalarFields())
            .user(true)
            .creator(true);

    default Page<CouponUserRel> findPage(QueryRequest<CouponUserRelSpec> queryRequest,
                                         Fetcher<CouponUserRel> fetcher) {
        CouponUserRelSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    default void changeStatus(String id, DictConstants.CouponUseStatus couponUseStatus) {
        if (!StringUtils.hasText(id)) {
            return;
        }
        sql().createUpdate(t)
                .set(t.status(), couponUseStatus)
                .where(t.id().eq(id))
                .execute();
    }

    /** CAS UNUSED → USED; returns false when already used or missing. */
    default boolean tryMarkUsed(String id) {
        if (!StringUtils.hasText(id)) {
            return false;
        }
        int updated = sql().createUpdate(t)
                .set(t.status(), DictConstants.CouponUseStatus.USED)
                .where(t.id().eq(id))
                .where(t.status().eq(DictConstants.CouponUseStatus.UNUSED))
                .execute();
        return updated > 0;
    }
}
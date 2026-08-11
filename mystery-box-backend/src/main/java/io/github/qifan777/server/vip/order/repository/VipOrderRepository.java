package io.github.qifan777.server.vip.order.repository;

import io.github.qifan777.server.coupon.user.entity.CouponUserRelFetcher;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.order.entity.BaseOrderFetcher;
import io.github.qifan777.server.payment.entity.PaymentFetcher;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import io.github.qifan777.server.vip.pack.entity.VipPackageFetcher;
import io.github.qifan777.server.vip.order.entity.VipOrder;
import io.github.qifan777.server.vip.order.entity.VipOrderFetcher;
import io.github.qifan777.server.vip.order.entity.VipOrderTable;
import io.github.qifan777.server.vip.order.entity.dto.VipOrderSpec;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface VipOrderRepository extends JRepository<VipOrder, String> {
    VipOrderTable t = VipOrderTable.$;
    VipOrderFetcher COMPLEX_FETCHER_FOR_ADMIN = VipOrderFetcher.$.allScalarFields()
            .baseOrder(BaseOrderFetcher.$
                    .allScalarFields()
                    .creator()
                    .couponUser(CouponUserRelFetcher.$.allScalarFields())
                    .payment(PaymentFetcher.$.allScalarFields()))
            .vipPackage(VipPackageFetcher.$.allScalarFields())
            .user(UserFetcher.$.phone().nickname())
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname());
    VipOrderFetcher COMPLEX_FETCHER_FOR_FRONT = VipOrderFetcher.$.allScalarFields()
            .baseOrder(BaseOrderFetcher.$
                    .allScalarFields()
                    .creator()
                    .couponUser(CouponUserRelFetcher.$.allScalarFields())
                    .payment(PaymentFetcher.$.allScalarFields()))
            .vipPackage(VipPackageFetcher.$.allScalarFields())
            .user(UserFetcher.$.phone().nickname())
            .creator(true);

    default Page<VipOrder> findPage(QueryRequest<VipOrderSpec> queryRequest,
                                    Fetcher<VipOrder> fetcher) {
        VipOrderSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    /** Unpaid VIP orders older than 5 minutes — for gateway QueryDR reconciliation. */
    default List<VipOrder> findUnpaidOrdersBatch(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        return sql().createQuery(t)
                .where(t.baseOrder().payment().payTime().isNull())
                .where(t.createdTime().le(LocalDateTime.now().minusMinutes(5)))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(COMPLEX_FETCHER_FOR_ADMIN))
                .limit(size)
                .execute();
    }
}
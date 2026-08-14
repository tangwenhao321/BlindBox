package io.github.qifan777.server.box.order.repository;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import io.github.qifan777.server.Fetchers;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItemFetcher;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderFetcher;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderTable;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderSpec;
import io.github.qifan777.server.box.order.OrderIdLookupBeans;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.coupon.root.entity.CouponFetcher;
import io.github.qifan777.server.coupon.user.entity.CouponUserRelFetcher;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.order.entity.BaseOrderFetcher;
import io.github.qifan777.server.payment.entity.PaymentFetcher;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.ast.Expression;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

public interface MysteryBoxOrderRepository extends JRepository<MysteryBoxOrder, String> {
    MysteryBoxOrderTable t = MysteryBoxOrderTable.$;
    MysteryBoxOrderFetcher COMPLEX_FETCHER_FOR_ADMIN = MysteryBoxOrderFetcher.$.allScalarFields()
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname())
            .baseOrder(BaseOrderFetcher.$.allScalarFields()
                    .payment(PaymentFetcher.$.allScalarFields())
                    .couponUser(CouponUserRelFetcher.$.coupon(CouponFetcher.$.allScalarFields())))
            .items(MysteryBoxOrderItemFetcher.$.allScalarFields());
    MysteryBoxOrderFetcher COMPLEX_FETCHER_FOR_FRONT = MysteryBoxOrderFetcher.$.allScalarFields()
            .baseOrder(BaseOrderFetcher.$.allScalarFields()
                    .payment(PaymentFetcher.$.allScalarFields())
                    .couponUser(CouponUserRelFetcher.$.coupon(CouponFetcher.$.allScalarFields())))
            .items(MysteryBoxOrderItemFetcher.$.allScalarFields())
            .creator(true);

    default Page<MysteryBoxOrder> findPage(QueryRequest<MysteryBoxOrderSpec> queryRequest,
                                           Fetcher<MysteryBoxOrder> fetcher) {
        MysteryBoxOrderSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .whereIf(StringUtils.hasText(query.getKeyword()), t.items(ex -> Expression.string()
                        .sql("%e", it -> it.expression(ex.mysteryBox()))
                        .ilikeIf(StringUtils.hasText(query.getKeyword()), query.getKeyword())))
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    default MysteryBoxOrder findByIdForFront(String id) {
        OrderIdLookupService lookup = OrderIdLookupBeans.lookup();
        String resolved = lookup != null ? lookup.resolveCurrentId(id) : id;
        return findById(resolved, COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
    }

    default List<MysteryBoxOrder> findUnpaidOrder() {
        return findUnpaidOrdersBatch(500);
    }

    default List<MysteryBoxOrder> findUnpaidOrdersBatch(int limit) {
        int size = Math.min(Math.max(limit, 1), 500);
        return sql().createQuery(t)
                .where(t.status().eq(ProductOrderStatus.TO_BE_PAID))
                .where(t.createdTime().le(LocalDateTime.now().minusMinutes(5)))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(Fetchers.MYSTERY_BOX_ORDER_FETCHER.allScalarFields().creator(true)))
                .limit(size)
                .execute();
    }

    /** 近期已支付/履约中订单 ID，供开奖一致性对账任务使用 */
    default List<String> findRecentlyPaidOrderIds(LocalDateTime editedSince, int limit) {
        return sql().createQuery(t)
                .where(t.status().ne(ProductOrderStatus.TO_BE_PAID))
                .where(t.status().ne(ProductOrderStatus.CLOSED))
                .where(t.editedTime().ge(editedSince))
                .orderBy(t.editedTime().desc())
                .select(t.id())
                .limit(limit)
                .execute();
    }

    default void changeStatus(String id, ProductOrderStatus status) {
        sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(t.status(), status)
                .execute();
    }

    /**
     * Compare-and-swap status. Returns {@code true} if exactly one row was updated.
     */
    default boolean changeStatusIf(
            String id,
            ProductOrderStatus from,
            ProductOrderStatus to
    ) {
        int updated = sql().createUpdate(t)
                .where(t.id().eq(id))
                .where(t.status().eq(from))
                .set(t.status(), to)
                .execute();
        return updated > 0;
    }

    /**
     * Claim an unpaid order for payment completion (before draw/pool mutation).
     * CAS {@link ProductOrderStatus#TO_BE_PAID} → {@link ProductOrderStatus#TO_BE_DELIVERED}.
     */
    default boolean claimPaid(String orderId) {
        return changeStatusIf(
                orderId,
                ProductOrderStatus.TO_BE_PAID,
                ProductOrderStatus.TO_BE_DELIVERED
        );
    }

}
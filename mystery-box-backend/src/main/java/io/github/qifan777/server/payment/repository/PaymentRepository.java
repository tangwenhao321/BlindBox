package io.github.qifan777.server.payment.repository;

import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentFetcher;
import io.github.qifan777.server.payment.entity.PaymentTable;
import io.github.qifan777.server.payment.entity.dto.PaymentSpec;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public interface PaymentRepository extends JRepository<Payment, String> {
    PaymentTable t = PaymentTable.$;
    PaymentFetcher COMPLEX_FETCHER_FOR_ADMIN = PaymentFetcher.$.allScalarFields()
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname());
    PaymentFetcher COMPLEX_FETCHER_FOR_FRONT = PaymentFetcher.$.allScalarFields()
            .creator(true);

    default Page<Payment> findPage(QueryRequest<PaymentSpec> queryRequest,
                                   Fetcher<Payment> fetcher) {
        PaymentSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    default void updatePayTimeAndTradeNo(String id, String tradNo, LocalDateTime payTime) {
        LocalDateTime normalizedPayTime = payTime == null ? null : payTime.truncatedTo(ChronoUnit.SECONDS);
        sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(t.payTime(), normalizedPayTime)
                .set(t.tradeNo(), tradNo)
                .execute();
    }

    /**
     * CAS: set pay_time/trade_no only when still unpaid. Returns true if this caller won.
     */
    default boolean claimPayTime(String id, String tradeNo, LocalDateTime payTime) {
        LocalDateTime normalizedPayTime = payTime == null
                ? LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS)
                : payTime.truncatedTo(ChronoUnit.SECONDS);
        int updated = sql().createUpdate(t)
                .where(t.id().eq(id))
                .where(t.payTime().isNull())
                .set(t.payTime(), normalizedPayTime)
                .set(t.tradeNo(), tradeNo)
                .execute();
        return updated > 0;
    }
}
package io.github.qifan777.server.referral.repository;

import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecord;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecordFetcher;
import io.github.qifan777.server.referral.entity.ReferralCommissionRecordTable;
import io.github.qifan777.server.referral.entity.dto.ReferralCommissionRecordSpec;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Optional;

public interface ReferralCommissionRecordRepository extends JRepository<ReferralCommissionRecord, String> {
    ReferralCommissionRecordTable t = ReferralCommissionRecordTable.$;
    ReferralCommissionRecordFetcher COMPLEX_FETCHER_FOR_FRONT = ReferralCommissionRecordFetcher.$.allScalarFields()
            .sourceUser(UserFetcher.$.nickname().phone());

    default Page<ReferralCommissionRecord> findPage(QueryRequest<ReferralCommissionRecordSpec> queryRequest,
                                                    Fetcher<ReferralCommissionRecord> fetcher) {
        ReferralCommissionRecordSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(), SpringPageFactory.getInstance());
    }

    default BigDecimal sumAmountByUserId(String userId) {
        BigDecimal sum = sql().createQuery(t)
                .where(t.userId().eq(userId))
                .select(t.amount().sum())
                .fetchOneOrNull();
        return sum == null ? BigDecimal.ZERO : sum;
    }

    default Optional<ReferralCommissionRecord> findByOrderId(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return Optional.empty();
        }
        return sql().createQuery(t)
                .where(t.orderId().eq(orderId))
                .select(t.fetch(ReferralCommissionRecordFetcher.$.allScalarFields()
                        .user(UserFetcher.$.allScalarFields())))
                .fetchOptional();
    }
}

package io.github.qifan777.server.refund.repository;

import io.github.qifan777.server.dict.model.RefundStatus;

import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordFetcher;
import io.github.qifan777.server.refund.entity.RefundRecordTable;
import io.github.qifan777.server.refund.entity.dto.RefundRecordSpec;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import org.babyfish.jimmer.spring.repository.JRepository;
import org.babyfish.jimmer.spring.repository.SpringOrders;
import org.babyfish.jimmer.spring.repository.support.SpringPageFactory;
import org.babyfish.jimmer.sql.fetcher.Fetcher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface RefundRecordRepository extends JRepository<RefundRecord, String> {
    RefundRecordTable t = RefundRecordTable.$;
    RefundRecordFetcher COMPLEX_FETCHER_FOR_ADMIN = RefundRecordFetcher.$.allScalarFields()
            .creator(UserFetcher.$.phone().nickname())
            .editor(UserFetcher.$.phone().nickname());
    RefundRecordFetcher COMPLEX_FETCHER_FOR_FRONT = RefundRecordFetcher.$.allScalarFields()
            .creator(true);

    default Page<RefundRecord> findPage(QueryRequest<RefundRecordSpec> queryRequest,
                                        Fetcher<RefundRecord> fetcher) {
        RefundRecordSpec query = queryRequest.getQuery();
        Pageable pageable = queryRequest.toPageable();
        return sql().createQuery(t)
                .where(query)
                .orderBy(SpringOrders.toOrders(t, pageable.getSort()))
                .select(t.fetch(fetcher))
                .fetchPage(queryRequest.getPageNum() - 1, queryRequest.getPageSize(),
                        SpringPageFactory.getInstance());
    }

    /** Stuck REFUNDING rows older than {@code olderThan}, oldest first. */
    default List<RefundRecord> findStuckRefunding(LocalDateTime olderThan, int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        return sql().createQuery(t)
                .where(t.status().eq(RefundStatus.REFUNDING))
                .where(t.createdTime().le(olderThan))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(COMPLEX_FETCHER_FOR_ADMIN))
                .limit(size)
                .execute();
    }

    default boolean existsRefundingOrSuccess(String orderId) {
        return sql().createQuery(t)
                .where(t.orderId().eq(orderId))
                .where(t.status().in(List.of(
                        RefundStatus.REFUNDING,
                        RefundStatus.SUCCESS)))
                .select(t.id())
                .limit(1)
                .fetchOptional()
                .isPresent();
    }

    /** CAS REFUNDING → SUCCESS. Returns false when already finalized or missing. */
    default boolean claimSuccess(String refundId, String gatewayRefundId) {
        if (refundId == null || refundId.isBlank()) {
            return false;
        }
        if (gatewayRefundId != null && !gatewayRefundId.isBlank()) {
            return sql().createUpdate(t)
                    .set(t.status(), RefundStatus.SUCCESS)
                    .set(t.refundId(), gatewayRefundId)
                    .where(t.id().eq(refundId))
                    .where(t.status().eq(RefundStatus.REFUNDING))
                    .execute() > 0;
        }
        return sql().createUpdate(t)
                .set(t.status(), RefundStatus.SUCCESS)
                .where(t.id().eq(refundId))
                .where(t.status().eq(RefundStatus.REFUNDING))
                .execute() > 0;
    }

    /**
     * Claim a REFUNDING row for gateway submit so concurrent approve cannot double-call Partner APIs.
     * Sets refundId to a transient marker when still null.
     */
    default boolean claimForGatewaySubmit(String refundId) {
        if (refundId == null || refundId.isBlank()) {
            return false;
        }
        String marker = "APPROVING:" + refundId;
        return sql().createUpdate(t)
                .set(t.refundId(), marker)
                .where(t.id().eq(refundId))
                .where(t.status().eq(RefundStatus.REFUNDING))
                .where(t.refundId().isNull())
                .execute() > 0;
    }
}
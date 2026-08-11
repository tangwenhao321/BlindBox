package io.github.qifan777.server.user.root.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.qifan.infrastructure.generator.core.GenEntity;
import org.babyfish.jimmer.sql.Entity;
import org.jetbrains.annotations.Nullable;

import java.math.BigDecimal;

@GenEntity
@Entity
public interface UserBalanceLog extends BaseEntity {

    String userId();

    String changeType();

    BigDecimal amount();

    BigDecimal balanceAfter();

    /** Business ref / idempotency key; null when the mutation is not idempotent. */
    @Nullable
    String relatedOrderId();

    String remark();
}

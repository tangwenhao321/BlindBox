package io.github.qifan777.server.user.root.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.qifan.infrastructure.generator.core.GenEntity;
import org.babyfish.jimmer.sql.Entity;

import java.math.BigDecimal;

@GenEntity
@Entity
public interface UserBalanceLog extends BaseEntity {

    String userId();

    String changeType();

    BigDecimal amount();

    BigDecimal balanceAfter();

    String relatedOrderId();

    String remark();
}

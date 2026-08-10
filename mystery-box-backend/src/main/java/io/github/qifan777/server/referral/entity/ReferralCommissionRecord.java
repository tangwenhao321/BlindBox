package io.github.qifan777.server.referral.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseDateTime;
import io.github.qifan777.server.infrastructure.jimmer.UUIDIdGenerator;
import io.github.qifan777.server.user.root.entity.User;
import jakarta.validation.constraints.Null;
import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.GeneratedValue;
import org.babyfish.jimmer.sql.Id;
import org.babyfish.jimmer.sql.ManyToOne;

import java.math.BigDecimal;

@Entity
public interface ReferralCommissionRecord extends BaseDateTime {

    @Id
    @GeneratedValue(generatorType = UUIDIdGenerator.class)
    String id();

    @ManyToOne
    User user();

    @Null
    @ManyToOne
    User sourceUser();

    @Null
    String orderId();

    BigDecimal amount();

    String remark();
}

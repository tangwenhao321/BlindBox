package io.github.qifan777.server.welfare.entity;

import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.GeneratedValue;
import org.babyfish.jimmer.sql.GenerationType;
import org.babyfish.jimmer.sql.Id;
import org.babyfish.jimmer.sql.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_check_in")
public interface UserCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    long id();

    String userId();

    LocalDate checkInDate();

    int rewardCoins();

    LocalDateTime createdTime();
}

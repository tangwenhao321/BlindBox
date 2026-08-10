package io.github.qifan777.server.welfare.entity;

import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.GeneratedValue;
import org.babyfish.jimmer.sql.GenerationType;
import org.babyfish.jimmer.sql.Id;
import org.babyfish.jimmer.sql.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_favorite")
public interface UserFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    long id();

    String userId();

    String mysteryBoxId();

    LocalDateTime createdTime();
}

package io.github.qifan777.server.welfare.repository;

import io.github.qifan777.server.welfare.entity.UserFavorite;
import io.github.qifan777.server.welfare.entity.UserFavoriteTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserFavoriteRepository extends JRepository<UserFavorite, Long> {
    UserFavoriteTable t = UserFavoriteTable.$;

    default Optional<UserFavorite> findByUserAndBox(String userId, String mysteryBoxId) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId), t.mysteryBoxId().eq(mysteryBoxId))
                .select(t)
                .fetchOptional();
    }

    default List<String> findBoxIdsByUser(String userId) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId))
                .select(t.mysteryBoxId())
                .execute();
    }

}

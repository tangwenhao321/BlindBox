package io.github.qifan777.server.welfare.repository;

import io.github.qifan777.server.welfare.entity.UserCheckIn;
import io.github.qifan777.server.welfare.entity.UserCheckInTable;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

public interface UserCheckInRepository extends JRepository<UserCheckIn, Long> {
    UserCheckInTable t = UserCheckInTable.$;

    default Optional<UserCheckIn> findByUserAndDate(String userId, LocalDate date) {
        return sql().createQuery(t)
                .where(t.userId().eq(userId), t.checkInDate().eq(date))
                .select(t)
                .fetchOptional();
    }

    default Set<LocalDate> findDatesByUserBetween(String userId, LocalDate from, LocalDate to) {
        List<LocalDate> dates = sql().createQuery(t)
                .where(
                        t.userId().eq(userId),
                        t.checkInDate().ge(from),
                        t.checkInDate().le(to)
                )
                .select(t.checkInDate())
                .execute();
        return dates.stream().collect(Collectors.toSet());
    }
}
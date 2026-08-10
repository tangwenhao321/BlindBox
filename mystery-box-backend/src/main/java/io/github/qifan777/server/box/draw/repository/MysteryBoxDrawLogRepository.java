package io.github.qifan777.server.box.draw.repository;

import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLog;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLogFetcher;
import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLogTable;
import io.github.qifan777.server.box.draw.support.DrawFeedCursor;
import org.babyfish.jimmer.sql.ast.Predicate;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.List;

public interface MysteryBoxDrawLogRepository extends JRepository<MysteryBoxDrawLog, String> {
    MysteryBoxDrawLogTable t = MysteryBoxDrawLogTable.$;
    MysteryBoxDrawLogFetcher FETCHER = MysteryBoxDrawLogFetcher.$.allScalarFields();

    default List<MysteryBoxDrawLog> findLatestByBox(String mysteryBoxId, int limit) {
        int size = limit <= 0 ? 20 : Math.min(limit, 100);
        return sql().createQuery(t)
                .where(t.mysteryBoxId().eq(mysteryBoxId))
                .orderBy(t.createdTime().desc(), t.id().desc())
                .select(t.fetch(FETCHER))
                .limit(size)
                .execute();
    }

    default List<MysteryBoxDrawLog> findByOrderId(String orderId) {
        return sql().createQuery(t)
                .where(t.mysteryBoxOrderId().eq(orderId))
                .orderBy(t.createdTime().asc())
                .select(t.fetch(FETCHER))
                .execute();
    }

    default List<MysteryBoxDrawLog> findLatestGlobal(int limit) {
        int size = limit <= 0 ? 20 : Math.min(limit, 100);
        return sql().createQuery(t)
                .orderBy(t.createdTime().desc(), t.id().desc())
                .select(t.fetch(FETCHER))
                .limit(size)
                .execute();
    }

    default List<MysteryBoxDrawLog> findLatestByBoxAfterCursor(String mysteryBoxId, int limit, String cursor) {
        int size = limit <= 0 ? 20 : Math.min(limit, 100);
        var query = sql().createQuery(t).where(t.mysteryBoxId().eq(mysteryBoxId));
        applyCursor(query, cursor);
        return query.orderBy(t.createdTime().desc(), t.id().desc())
                .select(t.fetch(FETCHER))
                .limit(size)
                .execute();
    }

    default List<MysteryBoxDrawLog> findLatestGlobalAfterCursor(int limit, String cursor) {
        int size = limit <= 0 ? 20 : Math.min(limit, 100);
        var query = sql().createQuery(t);
        applyCursor(query, cursor);
        return query.orderBy(t.createdTime().desc(), t.id().desc())
                .select(t.fetch(FETCHER))
                .limit(size)
                .execute();
    }

    private static void applyCursor(
            org.babyfish.jimmer.sql.ast.query.MutableRootQuery<MysteryBoxDrawLogTable> query,
            String cursor
    ) {
        DrawFeedCursor.Parsed parsed = DrawFeedCursor.parse(cursor);
        if (parsed == null && cursor != null && !cursor.isBlank()) {
            query.where(t.id().lt(cursor));
            return;
        }
        if (parsed == null) {
            return;
        }
        query.where(
                Predicate.or(
                        t.createdTime().lt(parsed.createdTime()),
                        Predicate.and(
                                t.createdTime().eq(parsed.createdTime()),
                                t.id().lt(parsed.id())
                        )
                )
        );
    }
}

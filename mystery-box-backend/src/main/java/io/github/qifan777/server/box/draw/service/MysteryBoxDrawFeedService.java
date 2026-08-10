package io.github.qifan777.server.box.draw.service;

import io.github.qifan777.server.box.draw.entity.MysteryBoxDrawLog;
import io.github.qifan777.server.box.draw.model.DrawFeedItemView;
import io.github.qifan777.server.box.draw.model.DrawFeedPageView;
import io.github.qifan777.server.box.draw.repository.MysteryBoxDrawLogRepository;
import io.github.qifan777.server.box.draw.support.DrawFeedCursor;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import io.github.qifan777.server.user.privacy.NicknameMaskService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MysteryBoxDrawFeedService {
    private static final long CACHE_TTL_MS = 30_000L;

    private final MysteryBoxDrawLogRepository mysteryBoxDrawLogRepository;
    private final UserRepository userRepository;
    private final NicknameMaskService nicknameMaskService;
    private volatile CachedPage globalFirstPageCache;

    public void invalidateCaches() {
        globalFirstPageCache = null;
    }

    public DrawFeedPageView feedPage(String mysteryBoxId, int limit, String cursor) {
        if ((mysteryBoxId == null || mysteryBoxId.isBlank()) && (cursor == null || cursor.isBlank())) {
            CachedPage cached = globalFirstPageCache;
            if (cached != null && System.currentTimeMillis() - cached.atMs < CACHE_TTL_MS) {
                return cached.page;
            }
        }
        List<MysteryBoxDrawLog> logs = mysteryBoxId == null || mysteryBoxId.isBlank()
                ? mysteryBoxDrawLogRepository.findLatestGlobalAfterCursor(limit, cursor)
                : mysteryBoxDrawLogRepository.findLatestByBoxAfterCursor(mysteryBoxId, limit, cursor);
        List<DrawFeedItemView> items = mapLogs(logs);
        String nextCursor = logs.size() >= Math.min(Math.max(limit, 1), 100) && !logs.isEmpty()
                ? DrawFeedCursor.encode(
                logs.get(logs.size() - 1).createdTime(),
                logs.get(logs.size() - 1).id()
        )
                : null;
        DrawFeedPageView page = new DrawFeedPageView(items, nextCursor);
        if ((mysteryBoxId == null || mysteryBoxId.isBlank()) && (cursor == null || cursor.isBlank())) {
            globalFirstPageCache = new CachedPage(page, System.currentTimeMillis());
        }
        return page;
    }

    public List<DrawFeedItemView> feed(String mysteryBoxId, int limit) {
        return feedPage(mysteryBoxId, limit, null).items();
    }

    private List<DrawFeedItemView> mapLogs(List<MysteryBoxDrawLog> logs) {
        Map<String, String> nicknames = userRepository.findByIds(
                logs.stream().map(MysteryBoxDrawLog::userId).distinct().toList()
        ).stream().collect(Collectors.toMap(User::id, u -> nicknameMaskService.displayName(u.id(), u.nickname())));
        return logs.stream()
                .map(log -> new DrawFeedItemView(
                        log.id(),
                        nicknames.getOrDefault(log.userId(), nicknameMaskService.maskUserId(log.userId(), "用户")),
                        log.productName(),
                        log.qualityType(),
                        log.lastOne(),
                        log.createdTime()
                ))
                .toList();
    }

    private record CachedPage(DrawFeedPageView page, long atMs) {
    }
}

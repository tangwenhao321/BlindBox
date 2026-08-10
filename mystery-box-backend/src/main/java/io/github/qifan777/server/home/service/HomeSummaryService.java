package io.github.qifan777.server.home.service;

import io.github.qifan777.server.home.cache.HomeSummaryCache;
import io.github.qifan777.server.home.model.HomeSummaryView;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.recommendation.service.RecommendationService;
import io.github.qifan777.server.slideshow.entity.Slideshow;
import io.github.qifan777.server.slideshow.entity.dto.SlideshowSpec;
import io.github.qifan777.server.slideshow.repository.SlideshowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.sql.Timestamp;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HomeSummaryService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private final JdbcTemplate jdbcTemplate;
    private final HomeSummaryCache homeSummaryCache;
    private final SlideshowRepository slideshowRepository;
    private final RecommendationService recommendationService;

    public HomeSummaryView summary() {
        return summary(null);
    }

    public HomeSummaryView summary(Object loginId) {
        HomeSummaryView base = homeSummaryCache.get().orElseGet(() -> {
            HomeSummaryView view = loadSummary();
            homeSummaryCache.put(view);
            return view;
        });
        List<String> recommend = resolveRecommendBoxIds(loginId, base);
        String userId = resolveUserId(loginId);
        long todayDraws = base.todayDrawCount();
        long todayLegendary = base.todayLegendaryCount();
        if (userId != null) {
            todayDraws = countUserDrawsToday(userId);
            todayLegendary = countUserLegendaryToday(userId);
        }
        if (recommend == base.recommendBoxIds()
                && todayDraws == base.todayDrawCount()
                && todayLegendary == base.todayLegendaryCount()) {
            return base;
        }
        return new HomeSummaryView(
                todayDraws,
                todayLegendary,
                base.hotBoxes(),
                recommend,
                base.banners()
        );
    }

    private String resolveUserId(Object loginId) {
        if (loginId == null) {
            return null;
        }
        String userId = String.valueOf(loginId);
        if (userId.isBlank() || "null".equals(userId)) {
            return null;
        }
        return userId;
    }

    private ZonedDateTime startOfBusinessDay() {
        return LocalDate.now(BUSINESS_ZONE).atStartOfDay(BUSINESS_ZONE);
    }

    private long countUserDrawsToday(String userId) {
        ZonedDateTime start = startOfBusinessDay();
        ZonedDateTime end = start.plusDays(1);
        Long count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM mystery_box_draw_log
                        WHERE user_id = ? AND created_time >= ? AND created_time < ?
                        """,
                Long.class,
                userId,
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant())
        );
        return count == null ? 0 : count;
    }

    private long countUserLegendaryToday(String userId) {
        ZonedDateTime start = startOfBusinessDay();
        ZonedDateTime end = start.plusDays(1);
        Long count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM mystery_box_draw_log
                        WHERE user_id = ? AND quality_type = 'LEGENDARY'
                          AND created_time >= ? AND created_time < ?
                        """,
                Long.class,
                userId,
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant())
        );
        return count == null ? 0 : count;
    }

    private HomeSummaryView loadSummary() {
        ZonedDateTime start = startOfBusinessDay();
        ZonedDateTime end = start.plusDays(1);
        Long todayDraws = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM mystery_box_draw_log
                        WHERE created_time >= ? AND created_time < ?
                        """,
                Long.class,
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant())
        );
        Long todayLegendary = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM mystery_box_draw_log
                        WHERE quality_type = 'LEGENDARY'
                          AND created_time >= ? AND created_time < ?
                        """,
                Long.class,
                Timestamp.from(start.toInstant()),
                Timestamp.from(end.toInstant())
        );
        List<HomeSummaryView.HotBoxView> hot = loadHotBoxes();
        List<String> recommend = hot.stream().map(HomeSummaryView.HotBoxView::id).limit(10).toList();
        return new HomeSummaryView(
                todayDraws == null ? 0 : todayDraws,
                todayLegendary == null ? 0 : todayLegendary,
                hot,
                recommend,
                loadBanners()
        );
    }

    private List<HomeSummaryView.BannerView> loadBanners() {
        SlideshowSpec spec = new SlideshowSpec();
        spec.setValid(true);
        QueryRequest<SlideshowSpec> request = new QueryRequest<>();
        request.setQuery(spec);
        request.setPageNum(1);
        request.setPageSize(6);
        return slideshowRepository
                .findPage(request, SlideshowRepository.COMPLEX_FETCHER_FOR_FRONT)
                .getContent()
                .stream()
                .map(this::toBanner)
                .toList();
    }

    private HomeSummaryView.BannerView toBanner(Slideshow slide) {
        String navigatorType = slide.navigatorType() == null ? null : slide.navigatorType().getKeyEnName();
        return new HomeSummaryView.BannerView(
                slide.id(),
                slide.picture(),
                slide.content(),
                slide.navigatorId(),
                navigatorType
        );
    }

    public void evictSummaryCache() {
        homeSummaryCache.evict();
    }

    public List<String> recommend() {
        return recommend(null);
    }

    public List<String> recommend(Object loginId) {
        return summary(loginId).recommendBoxIds();
    }

    private List<String> resolveRecommendBoxIds(Object loginId, HomeSummaryView base) {
        if (loginId == null) {
            return base.recommendBoxIds();
        }
        String userId = String.valueOf(loginId);
        if (userId.isBlank() || "null".equals(userId)) {
            return base.recommendBoxIds();
        }
        List<String> personalized = recommendationService.recommendBoxIds(userId, 10);
        if (personalized.isEmpty()) {
            return base.recommendBoxIds();
        }
        return personalized;
    }

    private List<HomeSummaryView.HotBoxView> loadHotBoxes() {
        List<HomeSummaryView.HotBoxView> dynamic = queryWeeklyHotBoxes(8);
        List<HomeSummaryView.HotBoxView> configured = queryConfiguredHotBoxes();
        if (configured.isEmpty()) {
            return dynamic;
        }
        java.util.LinkedHashMap<String, HomeSummaryView.HotBoxView> merged = new java.util.LinkedHashMap<>();
        for (HomeSummaryView.HotBoxView box : configured) {
            merged.putIfAbsent(box.id(), box);
        }
        for (HomeSummaryView.HotBoxView box : dynamic) {
            if (merged.size() >= 8) {
                break;
            }
            merged.putIfAbsent(box.id(), box);
        }
        return new java.util.ArrayList<>(merged.values());
    }

    private List<HomeSummaryView.HotBoxView> queryConfiguredHotBoxes() {
        return jdbcTemplate.query(
                """
                        SELECT mb.id, mb.name, mb.cover, mb.pool_total, mb.pool_remaining,
                               COALESCE(s.cnt, 0) AS draw_count
                        FROM ops_home_hot_box h
                        JOIN mystery_box mb ON mb.id = h.mystery_box_id
                        LEFT JOIN (
                            SELECT mystery_box_id, COUNT(1) AS cnt
                            FROM mystery_box_draw_log
                            WHERE created_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY mystery_box_id
                        ) s ON s.mystery_box_id = mb.id
                        WHERE h.enabled = 1
                        ORDER BY h.sort_order ASC, s.cnt DESC
                        LIMIT 8
                        """,
                mapHotBoxRow()
        );
    }

    private List<HomeSummaryView.HotBoxView> queryWeeklyHotBoxes(int limit) {
        return jdbcTemplate.query(
                """
                        SELECT mb.id, mb.name, mb.cover, mb.pool_total, mb.pool_remaining,
                               COALESCE(s.cnt, 0) AS draw_count
                        FROM mystery_box mb
                        LEFT JOIN (
                            SELECT mystery_box_id, COUNT(1) AS cnt
                            FROM mystery_box_draw_log
                            WHERE created_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY mystery_box_id
                        ) s ON s.mystery_box_id = mb.id
                        ORDER BY s.cnt DESC, mb.pool_remaining DESC, mb.edited_time DESC
                        LIMIT ?
                        """,
                mapHotBoxRow(),
                limit
        );
    }

    private org.springframework.jdbc.core.RowMapper<HomeSummaryView.HotBoxView> mapHotBoxRow() {
        return (rs, rowNum) -> new HomeSummaryView.HotBoxView(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("cover"),
                rs.getInt("pool_total"),
                rs.getInt("pool_remaining"),
                rs.getInt("draw_count")
        );
    }
}

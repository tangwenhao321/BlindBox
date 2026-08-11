package io.github.qifan777.server.appversion.service;

import cn.hutool.core.util.IdUtil;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores published mobile binaries so that {@code front/app/update-check} is driven by data
 * that operators can change at runtime, rather than by per-deployment environment variables.
 */
@Service
@RequiredArgsConstructor
public class AppVersionReleaseService {
    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    private static final String DEFAULT_CHANNEL = "production";
    private static final long CACHE_TTL_MS = 30_000L;
    private static final String COLUMNS = """
            id, platform, channel, version_code, version_name, download_url, force_update,
            min_supported_version_code, release_notes, push_title, push_body, auto_push, status,
            published_time, last_pushed_time, push_sent_count, operator, created_time, edited_time
            """;

    private final JdbcTemplate jdbcTemplate;

    /** Short-lived cache: update-check runs on every app foreground, so this is a hot read path. */
    private final Map<String, CachedRelease> publishedCache = new ConcurrentHashMap<>();

    public Optional<Release> resolvePublished(String platform, String channel) {
        String normalizedPlatform = normalizePlatform(platform);
        String normalizedChannel = normalizeChannel(channel);
        String cacheKey = normalizedPlatform + "|" + normalizedChannel;
        CachedRelease cached = publishedCache.get(cacheKey);
        long now = System.currentTimeMillis();
        if (cached != null && now - cached.cachedAt() < CACHE_TTL_MS) {
            return Optional.ofNullable(cached.release());
        }
        Release resolved = queryPublished(normalizedPlatform, normalizedChannel);
        publishedCache.put(cacheKey, new CachedRelease(resolved, now));
        return Optional.ofNullable(resolved);
    }

    private Release queryPublished(String platform, String channel) {
        // Prefer the highest versionCode across the requested channel and production so a stale
        // side-channel release (e.g. old "test") cannot shadow a newer production binary.
        List<Release> rows = jdbcTemplate.query(
                "SELECT " + COLUMNS + """
                        FROM app_version_release
                        WHERE platform = ? AND status = ? AND channel IN (?, ?)
                        ORDER BY version_code DESC, FIELD(channel, ?, ?)
                        LIMIT 1
                        """,
                MAPPER,
                platform,
                STATUS_PUBLISHED,
                channel,
                DEFAULT_CHANNEL,
                channel,
                DEFAULT_CHANNEL
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Release> list(String platform) {
        if (platform == null || platform.isBlank()) {
            return jdbcTemplate.query(
                    "SELECT " + COLUMNS + " FROM app_version_release ORDER BY platform, version_code DESC",
                    MAPPER
            );
        }
        return jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM app_version_release WHERE platform = ? ORDER BY version_code DESC",
                MAPPER,
                normalizePlatform(platform)
        );
    }

    public Release get(String id) {
        List<Release> rows = jdbcTemplate.query(
                "SELECT " + COLUMNS + " FROM app_version_release WHERE id = ?",
                MAPPER,
                id
        );
        if (rows.isEmpty()) {
            throw new BusinessException(ResultCode.NotFindError, "版本记录不存在");
        }
        return rows.get(0);
    }

    public Release create(ReleaseInput input, String operator) {
        validate(input);
        String id = IdUtil.fastSimpleUUID();
        jdbcTemplate.update(
                """
                        INSERT INTO app_version_release
                            (id, platform, channel, version_code, version_name, download_url, force_update,
                             min_supported_version_code, release_notes, push_title, push_body, auto_push,
                             status, operator, created_time, edited_time)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                id,
                normalizePlatform(input.platform()),
                normalizeChannel(input.channel()),
                input.versionCode(),
                trim(input.versionName()),
                trim(input.downloadUrl()),
                bool(input.forceUpdate()),
                Math.max(0, input.minSupportedVersionCode() == null ? 0 : input.minSupportedVersionCode()),
                trim(input.releaseNotes()),
                trim(input.pushTitle()),
                trim(input.pushBody()),
                input.autoPush() == null || input.autoPush() ? 1 : 0,
                STATUS_DRAFT,
                safeOperator(operator),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        invalidateCache();
        return get(id);
    }

    public Release update(String id, ReleaseInput input, String operator) {
        Release existing = get(id);
        validate(input);
        if (STATUS_ARCHIVED.equals(existing.status())) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "已归档的版本不可修改");
        }
        jdbcTemplate.update(
                """
                        UPDATE app_version_release
                        SET platform = ?, channel = ?, version_code = ?, version_name = ?, download_url = ?,
                            force_update = ?, min_supported_version_code = ?, release_notes = ?, push_title = ?,
                            push_body = ?, auto_push = ?, operator = ?, edited_time = ?
                        WHERE id = ?
                        """,
                normalizePlatform(input.platform()),
                normalizeChannel(input.channel()),
                input.versionCode(),
                trim(input.versionName()),
                trim(input.downloadUrl()),
                bool(input.forceUpdate()),
                Math.max(0, input.minSupportedVersionCode() == null ? 0 : input.minSupportedVersionCode()),
                trim(input.releaseNotes()),
                trim(input.pushTitle()),
                trim(input.pushBody()),
                input.autoPush() == null || input.autoPush() ? 1 : 0,
                safeOperator(operator),
                LocalDateTime.now(),
                id
        );
        invalidateCache();
        return get(id);
    }

    public Release publish(String id, String operator) {
        Release existing = get(id);
        if (existing.versionCode() <= 0 || existing.downloadUrl().isBlank()) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "发布前需填写版本号与下载地址");
        }
        jdbcTemplate.update(
                """
                        UPDATE app_version_release
                        SET status = ?, published_time = COALESCE(published_time, ?), operator = ?, edited_time = ?
                        WHERE id = ?
                        """,
                STATUS_PUBLISHED,
                LocalDateTime.now(),
                safeOperator(operator),
                LocalDateTime.now(),
                id
        );
        // Older releases on the same channel must stop serving so rollback is an explicit action.
        jdbcTemplate.update(
                """
                        UPDATE app_version_release
                        SET status = ?, edited_time = ?
                        WHERE platform = ? AND channel = ? AND status = ? AND version_code < ?
                        """,
                STATUS_ARCHIVED,
                LocalDateTime.now(),
                existing.platform(),
                existing.channel(),
                STATUS_PUBLISHED,
                existing.versionCode()
        );
        invalidateCache();
        return get(id);
    }

    public Release archive(String id, String operator) {
        get(id);
        jdbcTemplate.update(
                "UPDATE app_version_release SET status = ?, operator = ?, edited_time = ? WHERE id = ?",
                STATUS_ARCHIVED,
                safeOperator(operator),
                LocalDateTime.now(),
                id
        );
        invalidateCache();
        return get(id);
    }

    public void delete(String id) {
        Release existing = get(id);
        if (STATUS_PUBLISHED.equals(existing.status())) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "已发布的版本不可删除，请先归档");
        }
        jdbcTemplate.update("DELETE FROM app_version_release WHERE id = ?", id);
        invalidateCache();
    }

    public void recordPush(String releaseId, String triggerSource, String operator, int targetCount) {
        jdbcTemplate.update(
                """
                        UPDATE app_version_release
                        SET last_pushed_time = ?, push_sent_count = push_sent_count + ?
                        WHERE id = ?
                        """,
                LocalDateTime.now(),
                targetCount,
                releaseId
        );
        jdbcTemplate.update(
                """
                        INSERT INTO app_version_push_log (id, release_id, trigger_source, operator, target_count, created_time)
                        VALUES (?,?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                releaseId,
                triggerSource,
                safeOperator(operator),
                targetCount,
                LocalDateTime.now()
        );
        invalidateCache();
    }

    public List<PushLogEntry> listPushLogs(String releaseId) {
        return jdbcTemplate.query(
                """
                        SELECT id, release_id, trigger_source, operator, target_count, created_time
                        FROM app_version_push_log
                        WHERE release_id = ?
                        ORDER BY created_time DESC
                        LIMIT 50
                        """,
                (rs, rowNum) -> new PushLogEntry(
                        rs.getString("id"),
                        rs.getString("release_id"),
                        rs.getString("trigger_source"),
                        rs.getString("operator"),
                        rs.getInt("target_count"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                releaseId
        );
    }

    private void invalidateCache() {
        publishedCache.clear();
    }

    private static void validate(ReleaseInput input) {
        if (input == null) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "版本信息不能为空");
        }
        if (input.versionCode() == null || input.versionCode() <= 0) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "版本号(versionCode)必须大于 0");
        }
        String url = trim(input.downloadUrl());
        if (!url.isBlank() && !url.startsWith("http://") && !url.startsWith("https://")) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "下载地址必须以 http:// 或 https:// 开头");
        }
        if (input.minSupportedVersionCode() != null && input.minSupportedVersionCode() > input.versionCode()) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "最低支持版本不能高于当前版本号");
        }
    }

    private static String normalizePlatform(String platform) {
        if (platform == null || platform.isBlank()) {
            return "android";
        }
        return platform.trim().toLowerCase();
    }

    private static String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) {
            return DEFAULT_CHANNEL;
        }
        return channel.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static int bool(Boolean value) {
        return Boolean.TRUE.equals(value) ? 1 : 0;
    }

    private static String safeOperator(String operator) {
        return operator == null || operator.isBlank() ? "system" : operator.trim();
    }

    private static final RowMapper<Release> MAPPER = (rs, rowNum) -> new Release(
            rs.getString("id"),
            rs.getString("platform"),
            rs.getString("channel"),
            rs.getInt("version_code"),
            rs.getString("version_name") == null ? "" : rs.getString("version_name"),
            rs.getString("download_url") == null ? "" : rs.getString("download_url"),
            rs.getInt("force_update") == 1,
            rs.getInt("min_supported_version_code"),
            rs.getString("release_notes") == null ? "" : rs.getString("release_notes"),
            rs.getString("push_title") == null ? "" : rs.getString("push_title"),
            rs.getString("push_body") == null ? "" : rs.getString("push_body"),
            rs.getInt("auto_push") == 1,
            rs.getString("status"),
            toLocalDateTime(rs.getTimestamp("published_time")),
            toLocalDateTime(rs.getTimestamp("last_pushed_time")),
            rs.getInt("push_sent_count"),
            rs.getString("operator") == null ? "" : rs.getString("operator"),
            toLocalDateTime(rs.getTimestamp("created_time")),
            toLocalDateTime(rs.getTimestamp("edited_time"))
    );

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    public record Release(
            String id,
            String platform,
            String channel,
            int versionCode,
            String versionName,
            String downloadUrl,
            boolean forceUpdate,
            int minSupportedVersionCode,
            String releaseNotes,
            String pushTitle,
            String pushBody,
            boolean autoPush,
            String status,
            LocalDateTime publishedTime,
            LocalDateTime lastPushedTime,
            int pushSentCount,
            String operator,
            LocalDateTime createdTime,
            LocalDateTime editedTime
    ) {
    }

    public record ReleaseInput(
            String platform,
            String channel,
            Integer versionCode,
            String versionName,
            String downloadUrl,
            Boolean forceUpdate,
            Integer minSupportedVersionCode,
            String releaseNotes,
            String pushTitle,
            String pushBody,
            Boolean autoPush
    ) {
    }

    public record PushLogEntry(
            String id,
            String releaseId,
            String triggerSource,
            String operator,
            int targetCount,
            LocalDateTime createdTime
    ) {
    }

    private record CachedRelease(Release release, long cachedAt) {
    }
}

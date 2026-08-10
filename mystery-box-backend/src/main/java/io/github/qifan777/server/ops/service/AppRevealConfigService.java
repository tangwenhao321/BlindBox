package io.github.qifan777.server.ops.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppRevealConfigService {
    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    /** Aligned with mobile {@code clampMs} upper bounds in revealRemote.ts */
    public static final int MAX_REVEAL_STEP_MS = 8_000;
    public static final int MAX_REVEAL_SUMMARY_HERO_MS = 12_000;
    public static final int MAX_REVEAL_DELAY_MS_OVERRIDE = 15_000;

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private static final Map<String, Map<String, Object>> TEMPLATE_PRESETS = buildTemplatePresets();

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;

    private TransactionTemplate requiresNewTransaction;
    private TransactionTemplate defaultTransaction;

    @PostConstruct
    void initRequiresNewTransaction() {
        defaultTransaction = new TransactionTemplate(transactionManager);
        requiresNewTransaction = new TransactionTemplate(transactionManager);
        requiresNewTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public Optional<ResolvedRevealConfig> resolveEffectiveConfig(String userId,
                                                                 String boxId,
                                                                 String categoryId,
                                                                 String themeId) {
        ConfigVersion fallback = findPublishedVersion().orElse(null);
        List<RolloutRule> rollouts = listEnabledRollouts();
        for (RolloutRule rollout : rollouts) {
            if (!matchesBucket(rollout, userId, boxId, categoryId, themeId)) {
                continue;
            }
            if (!passesPercentageGate(userId, rollout)) {
                continue;
            }
            ConfigVersion version = getVersionById(rollout.versionId());
            if (version == null || !STATUS_PUBLISHED.equals(version.status())) {
                continue;
            }
            return Optional.of(toResolvedConfig(version));
        }
        if (fallback == null) {
            return Optional.empty();
        }
        return Optional.of(toResolvedConfig(fallback));
    }

    public List<ConfigVersion> listVersions() {
        return jdbcTemplate.query(
                """
                        SELECT id, version_no, template_id, payload_json, status, created_by, created_at
                        FROM ops_app_config_version
                        ORDER BY version_no DESC
                        """,
                (rs, rowNum) -> mapVersion(rs)
        );
    }

    public ConfigVersion getVersion(String id) {
        List<ConfigVersion> rows = jdbcTemplate.query(
                """
                        SELECT id, version_no, template_id, payload_json, status, created_by, created_at
                        FROM ops_app_config_version
                        WHERE id = ?
                        """,
                (rs, rowNum) -> mapVersion(rs),
                id
        );
        if (rows.isEmpty()) {
            throw new BusinessException(ResultCode.NotFindError, "配置版本不存在: " + id);
        }
        return rows.get(0);
    }

    @Transactional
    public ConfigVersion createVersion(VersionInput input, String operator) {
        if (!StringUtils.hasText(input.payloadJson())) {
            throw new BusinessException("payloadJson 不能为空");
        }
        validatePayloadJson(input.payloadJson());
        String id = newId();
        int versionNo = nextVersionNo();
        LocalDateTime now = LocalDateTime.now();
        jdbcTemplate.update(
                """
                        INSERT INTO ops_app_config_version
                        (id, version_no, template_id, payload_json, status, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                id,
                versionNo,
                normalize(input.templateId()),
                input.payloadJson(),
                STATUS_DRAFT,
                normalize(operator),
                now
        );
        appendAudit(id, "CREATE", operator, Map.of("versionNo", versionNo, "templateId", normalize(input.templateId())));
        return getVersion(id);
    }

    @Transactional
    public ConfigVersion updateVersion(String id, VersionInput input, String operator) {
        ConfigVersion existing = getVersion(id);
        if (STATUS_PUBLISHED.equals(existing.status())) {
            throw new BusinessException("已发布版本不可编辑，请创建新版本");
        }
        if (!StringUtils.hasText(input.payloadJson())) {
            throw new BusinessException("payloadJson 不能为空");
        }
        validatePayloadJson(input.payloadJson());
        jdbcTemplate.update(
                """
                        UPDATE ops_app_config_version
                        SET template_id = ?, payload_json = ?
                        WHERE id = ?
                        """,
                normalize(input.templateId()),
                input.payloadJson(),
                id
        );
        appendAudit(id, "UPDATE", operator, Map.of(
                "beforeTemplateId", existing.templateId(),
                "afterTemplateId", normalize(input.templateId())
        ));
        return getVersion(id);
    }

    @Transactional
    public void deleteVersion(String id, String operator) {
        ConfigVersion existing = getVersion(id);
        if (STATUS_PUBLISHED.equals(existing.status())) {
            throw new BusinessException("已发布版本不可删除，请先回滚");
        }
        jdbcTemplate.update("DELETE FROM ops_app_config_rollout WHERE version_id = ?", id);
        int deleted = jdbcTemplate.update("DELETE FROM ops_app_config_version WHERE id = ?", id);
        if (deleted == 0) {
            throw new BusinessException(ResultCode.NotFindError, "配置版本不存在: " + id);
        }
        appendAudit(id, "DELETE", operator, Map.of("versionNo", existing.versionNo()));
    }

    public ConfigVersion publishVersion(String id, String operator) {
        ConfigVersion target = getVersion(id);
        RevealFieldOverrides publishOverrides = buildRevealFieldOverrides(
                validationDurationDefaults(),
                toResolvedConfig(target)
        );
        try {
            validateRevealConfigBounds(publishOverrides);
        } catch (BusinessException ex) {
            requiresNewTransaction.executeWithoutResult(status -> appendAudit(id, "PUBLISH_REJECTED", operator, Map.of(
                    "reason", ex.getMessage(),
                    "versionNo", target.versionNo()
            )));
            throw ex;
        }
        return defaultTransaction.execute(status -> publishVersionTransactional(id, operator, target));
    }

    private ConfigVersion publishVersionTransactional(String id, String operator, ConfigVersion target) {
        ConfigVersion current = findPublishedVersion().orElse(null);
        if (current != null && !current.id().equals(id)) {
            jdbcTemplate.update(
                    "UPDATE ops_app_config_version SET status = ? WHERE id = ?",
                    STATUS_ARCHIVED,
                    current.id()
            );
            appendAudit(current.id(), "ARCHIVE", operator, Map.of("reason", "publish", "nextVersionId", id));
        }
        jdbcTemplate.update(
                "UPDATE ops_app_config_version SET status = ? WHERE id = ?",
                STATUS_PUBLISHED,
                id
        );
        appendAudit(id, "PUBLISH", operator, Map.of("versionNo", target.versionNo()));
        return getVersion(id);
    }

    @Transactional
    public ConfigVersion rollback(String operator) {
        ConfigVersion current = findPublishedVersion()
                .orElseThrow(() -> new BusinessException("当前没有已发布版本"));
        ConfigVersion previous = jdbcTemplate.query(
                """
                        SELECT id, version_no, template_id, payload_json, status, created_by, created_at
                        FROM ops_app_config_version
                        WHERE status = ? AND version_no < ?
                        ORDER BY version_no DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> mapVersion(rs),
                STATUS_ARCHIVED,
                current.versionNo()
        ).stream().findFirst().orElse(null);
        if (previous == null) {
            throw new BusinessException("没有可回滚的历史版本");
        }
        jdbcTemplate.update(
                "UPDATE ops_app_config_version SET status = ? WHERE id = ?",
                STATUS_ARCHIVED,
                current.id()
        );
        jdbcTemplate.update(
                "UPDATE ops_app_config_version SET status = ? WHERE id = ?",
                STATUS_PUBLISHED,
                previous.id()
        );
        appendAudit(current.id(), "ROLLBACK_FROM", operator, Map.of("toVersionId", previous.id()));
        appendAudit(previous.id(), "ROLLBACK_TO", operator, Map.of("fromVersionId", current.id()));
        return getVersion(previous.id());
    }

    public List<RolloutRule> listRollouts(String versionId) {
        return jdbcTemplate.query(
                """
                        SELECT id, version_id, bucket_type, bucket_key, percentage, priority, enabled
                        FROM ops_app_config_rollout
                        WHERE version_id = ?
                        ORDER BY priority DESC, bucket_type ASC
                        """,
                (rs, rowNum) -> mapRollout(rs),
                versionId
        );
    }

    public RolloutRule getRollout(String id) {
        List<RolloutRule> rows = jdbcTemplate.query(
                """
                        SELECT id, version_id, bucket_type, bucket_key, percentage, priority, enabled
                        FROM ops_app_config_rollout
                        WHERE id = ?
                        """,
                (rs, rowNum) -> mapRollout(rs),
                id
        );
        if (rows.isEmpty()) {
            throw new BusinessException(ResultCode.NotFindError, "灰度规则不存在: " + id);
        }
        return rows.get(0);
    }

    @Transactional
    public RolloutRule createRollout(RolloutInput input, String operator) {
        getVersion(input.versionId());
        validateRolloutInput(input);
        String id = newId();
        jdbcTemplate.update(
                """
                        INSERT INTO ops_app_config_rollout
                        (id, version_id, bucket_type, bucket_key, percentage, priority, enabled)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                id,
                input.versionId(),
                normalizeBucketType(input.bucketType()),
                normalize(input.bucketKey()),
                clampPercentage(input.percentage()),
                input.priority(),
                input.enabled()
        );
        appendAudit(input.versionId(), "ROLLOUT_CREATE", operator, Map.of("rolloutId", id));
        return getRollout(id);
    }

    @Transactional
    public RolloutRule updateRollout(String id, RolloutInput input, String operator) {
        RolloutRule existing = getRollout(id);
        validateRolloutInput(input);
        jdbcTemplate.update(
                """
                        UPDATE ops_app_config_rollout
                        SET version_id = ?, bucket_type = ?, bucket_key = ?, percentage = ?, priority = ?, enabled = ?
                        WHERE id = ?
                        """,
                input.versionId(),
                normalizeBucketType(input.bucketType()),
                normalize(input.bucketKey()),
                clampPercentage(input.percentage()),
                input.priority(),
                input.enabled(),
                id
        );
        appendAudit(input.versionId(), "ROLLOUT_UPDATE", operator, Map.of("rolloutId", id, "previousVersionId", existing.versionId()));
        return getRollout(id);
    }

    @Transactional
    public void deleteRollout(String id, String operator) {
        RolloutRule existing = getRollout(id);
        jdbcTemplate.update("DELETE FROM ops_app_config_rollout WHERE id = ?", id);
        appendAudit(existing.versionId(), "ROLLOUT_DELETE", operator, Map.of("rolloutId", id));
    }

    public List<ConfigTemplate> listTemplates() {
        return List.of("lively", "minimal", "turbo", "eyeCare", "collectMinimal").stream()
                .map(id -> new ConfigTemplate(id, toJson(TEMPLATE_PRESETS.get(id))))
                .toList();
    }

    public Map<String, Object> exportVersionJson(String id) {
        ConfigVersion version = getVersion(id);
        Map<String, Object> exported = new LinkedHashMap<>();
        exported.put("id", version.id());
        exported.put("versionNo", version.versionNo());
        exported.put("templateId", version.templateId());
        exported.put("status", version.status());
        exported.put("createdBy", version.createdBy());
        exported.put("createdAt", version.createdAt().toString());
        exported.put("payload", parsePayload(version.payloadJson()));
        return exported;
    }

    public Map<String, Object> exportTemplateJson(String templateId) {
        String normalized = normalize(templateId);
        Map<String, Object> preset = TEMPLATE_PRESETS.get(normalized);
        if (preset == null) {
            throw new BusinessException(ResultCode.NotFindError, "配置模板不存在: " + templateId);
        }
        Map<String, Object> exported = new LinkedHashMap<>();
        exported.put("templateId", normalized);
        exported.put("payload", preset);
        return exported;
    }

    public List<AuditLogEntry> listAuditLogs(String versionId) {
        return jdbcTemplate.query(
                """
                        SELECT id, version_id, action, operator, diff_json, created_at
                        FROM ops_app_config_audit_log
                        WHERE version_id = ?
                        ORDER BY created_at DESC
                        """,
                (rs, rowNum) -> new AuditLogEntry(
                        rs.getString("id"),
                        rs.getString("version_id"),
                        rs.getString("action"),
                        rs.getString("operator"),
                        rs.getString("diff_json"),
                        rs.getTimestamp("created_at").toLocalDateTime()
                ),
                versionId
        );
    }

    public RevealFieldOverrides mergeRevealFields(RevealFieldOverrides defaults, ResolvedRevealConfig resolved) {
        if (resolved == null) {
            return defaults;
        }
        return clampRevealConfigBounds(buildRevealFieldOverrides(defaults, resolved));
    }

    private RevealFieldOverrides buildRevealFieldOverrides(RevealFieldOverrides defaults, ResolvedRevealConfig resolved) {
        Map<String, Object> payload = resolved.payload();
        String revealCeremonyTemplateId = pickString(payload, "revealCeremonyTemplateId", "ceremonyTemplateId", defaults.revealCeremonyTemplateId());
        if (!payload.containsKey("revealCeremonyTemplateId") && !payload.containsKey("ceremonyTemplateId")) {
            revealCeremonyTemplateId = defaultCeremonyTemplateId(resolved.configTemplateId(), revealCeremonyTemplateId);
        }
        return new RevealFieldOverrides(
                pickDouble(payload, "revealParticleScale", defaults.revealParticleScale()),
                pickDouble(payload, "revealConfettiScale", defaults.revealConfettiScale()),
                pickInt(payload, "revealDelayMsOverride", defaults.revealDelayMsOverride()),
                pickDouble(payload, "revealChargeScale", defaults.revealChargeScale()),
                pickDouble(payload, "revealFlashScale", defaults.revealFlashScale()),
                pickDouble(payload, "revealLustreScale", defaults.revealLustreScale()),
                pickString(payload, "revealLustrePaletteId", defaults.revealLustrePaletteId()),
                pickString(payload, "revealLustreBoxOverrides", defaults.revealLustreBoxOverrides()),
                pickBoolean(payload, "revealFeedTickerEnabled", defaults.revealFeedTickerEnabled()),
                pickString(payload, "revealFeedTickerMinTier", "feedTickerMinTier", defaults.revealFeedTickerMinTier()),
                pickString(payload, "revealThemeId", defaults.revealThemeId()),
                pickString(payload, "revealIntroVideoUri", defaults.revealIntroVideoUri()),
                pickInt(payload, "revealInterDrawDelayMs", defaults.revealInterDrawDelayMs()),
                pickInt(payload, "revealFinalePauseMs", defaults.revealFinalePauseMs()),
                pickInt(payload, "revealFinaleHoldMsExtra", defaults.revealFinaleHoldMsExtra()),
                pickBoolean(payload, "revealFinaleTeaserEnabled", defaults.revealFinaleTeaserEnabled()),
                pickBoolean(payload, "revealFinaleTeaserHapticEnabled", "finaleTeaserHapticEnabled", defaults.revealFinaleTeaserHapticEnabled()),
                pickBoolean(payload, "revealFinaleTeaserSoundEnabled", "finaleTeaserSoundEnabled", defaults.revealFinaleTeaserSoundEnabled()),
                pickInt(payload, "revealSilenceBeforeFinaleMs", defaults.revealSilenceBeforeFinaleMs()),
                pickInt(payload, "revealSummaryHeroMs", defaults.revealSummaryHeroMs()),
                pickInt(payload, "revealComfortGapBoostMs", "comfortGapBoostMs", defaults.revealComfortGapBoostMs()),
                pickDouble(payload, "revealCardBackPulseScale", "cardBackPulseScale", defaults.revealCardBackPulseScale()),
                pickString(payload, "revealReduceMotionLevel", "reduceMotionLevel", defaults.revealReduceMotionLevel()),
                pickBoolean(payload, "revealHighlightsPanelEnabled", "highlightsPanelEnabled", defaults.revealHighlightsPanelEnabled()),
                pickBoolean(payload, "revealBoxTapInteractionEnabled", "boxTapInteractionEnabled", defaults.revealBoxTapInteractionEnabled()),
                pickBoolean(payload, "revealCollectionEasterEggEnabled", "collectionEasterEggEnabled", defaults.revealCollectionEasterEggEnabled()),
                pickJsonString(payload, "revealTierElementFlags", "tierElementFlags", defaults.revealTierElementFlags()),
                pickJsonString(payload, "revealPhaseEasingPresets", "phaseEasingPresets", defaults.revealPhaseEasingPresets()),
                pickDouble(payload, "revealShortDrawSlowScale", "shortDrawSlowScale", defaults.revealShortDrawSlowScale()),
                pickDouble(payload, "revealLongDrawFrontScale", "longDrawFrontScale", defaults.revealLongDrawFrontScale()),
                pickDouble(payload, "revealLongDrawFinaleScale", "longDrawFinaleScale", defaults.revealLongDrawFinaleScale()),
                pickInt(payload, "revealBatchRevealThreshold", "batchRevealThreshold", defaults.revealBatchRevealThreshold()),
                pickInt(payload, "revealBatchRevealSize", "batchRevealSize", defaults.revealBatchRevealSize()),
                pickInt(payload, "revealActionLockMs", "actionLockMs", defaults.revealActionLockMs()),
                pickInt(payload, "revealExitSettleMs", "exitSettleMs", defaults.revealExitSettleMs()),
                pickDouble(payload, "revealEffectVarianceScale", "effectVarianceScale", defaults.revealEffectVarianceScale()),
                pickString(payload, "revealLimitedThemeId", "limitedThemeId", defaults.revealLimitedThemeId()),
                pickInt(payload, "revealLimitedThemePriority", "limitedThemePriority", defaults.revealLimitedThemePriority()),
                pickJsonString(payload, "revealCopyPoolSizes", "copyPoolSizes", defaults.revealCopyPoolSizes()),
                pickInt(payload, "revealAudioFadeOutMs", "audioFadeOutMs", defaults.revealAudioFadeOutMs()),
                pickBoolean(payload, "revealVibrateFallbackEnabled", "vibrateFallbackEnabled", defaults.revealVibrateFallbackEnabled()),
                pickBoolean(payload, "revealFeedTickerTapEnabled", "feedTickerTapEnabled", defaults.revealFeedTickerTapEnabled()),
                pickDouble(payload, "revealFeedTickerPeakMultiplier", "feedTickerPeakMultiplier", defaults.revealFeedTickerPeakMultiplier()),
                pickString(payload, "revealBatchPreset", "batchPreset", defaults.revealBatchPreset()),
                pickBoolean(payload, "revealBatchBeatEnabled", "batchBeatEnabled", defaults.revealBatchBeatEnabled()),
                pickInt(payload, "revealBatchBeatMs", "batchBeatMs", defaults.revealBatchBeatMs()),
                pickBoolean(payload, "revealAchievementHintsEnabled", "achievementHintsEnabled", defaults.revealAchievementHintsEnabled()),
                pickInt(payload, "revealReplayDailyCap", "replayDailyCap", defaults.revealReplayDailyCap()),
                pickInt(payload, "revealReplayDegradeAfter", "replayDegradeAfter", defaults.revealReplayDegradeAfter()),
                pickInt(payload, "revealBackgroundResumeMaxMs", "backgroundResumeMaxMs", defaults.revealBackgroundResumeMaxMs()),
                pickDouble(payload, "revealCompactRevealScale", "compactRevealScale", defaults.revealCompactRevealScale()),
                pickBoolean(payload, "revealBoxDragInteractionEnabled", "boxDragInteractionEnabled", defaults.revealBoxDragInteractionEnabled()),
                pickJsonString(payload, "revealVoiceLineUris", "voiceLineUris", defaults.revealVoiceLineUris()),
                pickBoolean(payload, "revealRareWatermarkEnabled", "rareWatermarkEnabled", defaults.revealRareWatermarkEnabled()),
                pickJsonString(payload, "revealFeedTickerBlocklist", "feedTickerBlocklist", defaults.revealFeedTickerBlocklist()),
                pickDouble(payload, "revealRefreshRateHighScale", "refreshRateHighScale", defaults.revealRefreshRateHighScale()),
                pickDouble(payload, "revealRefreshRateLowScale", "refreshRateLowScale", defaults.revealRefreshRateLowScale()),
                pickDouble(payload, "revealDarkFlashScale", "darkFlashScale", defaults.revealDarkFlashScale()),
                pickInt(payload, "revealFeedTickerTtlMs", "feedTickerTtlMs", defaults.revealFeedTickerTtlMs()),
                pickBoolean(payload, "revealAtmosphereBuffEnabled", "atmosphereBuffEnabled", defaults.revealAtmosphereBuffEnabled()),
                pickBoolean(payload, "revealAmbientTapParticlesEnabled", "ambientTapParticlesEnabled", defaults.revealAmbientTapParticlesEnabled()),
                pickString(payload, "revealActiveEventTagUri", "activeEventTagUri", defaults.revealActiveEventTagUri()),
                pickString(payload, "revealFestivalTemplateId", "festivalTemplateId", defaults.revealFestivalTemplateId()),
                pickInt(payload, "revealShareTemplatePriority", "shareTemplatePriority", defaults.revealShareTemplatePriority()),
                pickInt(payload, "revealSessionIdleResetMs", "sessionIdleResetMs", defaults.revealSessionIdleResetMs()),
                revealCeremonyTemplateId,
                resolved.configVersion(),
                resolved.configTemplateId()
        );
    }

    public void validateRevealConfigBounds(RevealFieldOverrides overrides) {
        if (overrides == null) {
            return;
        }
        rejectDurationOutOfBounds("revealDelayMsOverride", overrides.revealDelayMsOverride(), MAX_REVEAL_DELAY_MS_OVERRIDE);
        rejectDurationOutOfBounds("revealInterDrawDelayMs", overrides.revealInterDrawDelayMs(), MAX_REVEAL_STEP_MS);
        rejectDurationOutOfBounds("revealFinalePauseMs", overrides.revealFinalePauseMs(), MAX_REVEAL_STEP_MS);
        rejectDurationOutOfBounds("revealFinaleHoldMsExtra", overrides.revealFinaleHoldMsExtra(), MAX_REVEAL_STEP_MS);
        rejectDurationOutOfBounds("revealSilenceBeforeFinaleMs", overrides.revealSilenceBeforeFinaleMs(), MAX_REVEAL_STEP_MS);
        rejectDurationOutOfBounds("revealSummaryHeroMs", overrides.revealSummaryHeroMs(), MAX_REVEAL_SUMMARY_HERO_MS);
    }

    private static RevealFieldOverrides clampRevealConfigBounds(RevealFieldOverrides overrides) {
        return new RevealFieldOverrides(
                overrides.revealParticleScale(),
                overrides.revealConfettiScale(),
                clampMs(overrides.revealDelayMsOverride(), MAX_REVEAL_DELAY_MS_OVERRIDE),
                overrides.revealChargeScale(),
                overrides.revealFlashScale(),
                overrides.revealLustreScale(),
                overrides.revealLustrePaletteId(),
                overrides.revealLustreBoxOverrides(),
                overrides.revealFeedTickerEnabled(),
                overrides.revealFeedTickerMinTier(),
                overrides.revealThemeId(),
                overrides.revealIntroVideoUri(),
                clampMs(overrides.revealInterDrawDelayMs(), MAX_REVEAL_STEP_MS),
                clampMs(overrides.revealFinalePauseMs(), MAX_REVEAL_STEP_MS),
                clampMs(overrides.revealFinaleHoldMsExtra(), MAX_REVEAL_STEP_MS),
                overrides.revealFinaleTeaserEnabled(),
                overrides.revealFinaleTeaserHapticEnabled(),
                overrides.revealFinaleTeaserSoundEnabled(),
                clampMs(overrides.revealSilenceBeforeFinaleMs(), MAX_REVEAL_STEP_MS),
                clampMs(overrides.revealSummaryHeroMs(), MAX_REVEAL_SUMMARY_HERO_MS),
                overrides.revealComfortGapBoostMs(),
                overrides.revealCardBackPulseScale(),
                overrides.revealReduceMotionLevel(),
                overrides.revealHighlightsPanelEnabled(),
                overrides.revealBoxTapInteractionEnabled(),
                overrides.revealCollectionEasterEggEnabled(),
                overrides.revealTierElementFlags(),
                overrides.revealPhaseEasingPresets(),
                overrides.revealShortDrawSlowScale(),
                overrides.revealLongDrawFrontScale(),
                overrides.revealLongDrawFinaleScale(),
                overrides.revealBatchRevealThreshold(),
                overrides.revealBatchRevealSize(),
                overrides.revealActionLockMs(),
                overrides.revealExitSettleMs(),
                overrides.revealEffectVarianceScale(),
                overrides.revealLimitedThemeId(),
                overrides.revealLimitedThemePriority(),
                overrides.revealCopyPoolSizes(),
                overrides.revealAudioFadeOutMs(),
                overrides.revealVibrateFallbackEnabled(),
                overrides.revealFeedTickerTapEnabled(),
                overrides.revealFeedTickerPeakMultiplier(),
                overrides.revealBatchPreset(),
                overrides.revealBatchBeatEnabled(),
                overrides.revealBatchBeatMs(),
                overrides.revealAchievementHintsEnabled(),
                overrides.revealReplayDailyCap(),
                overrides.revealReplayDegradeAfter(),
                overrides.revealBackgroundResumeMaxMs(),
                overrides.revealCompactRevealScale(),
                overrides.revealBoxDragInteractionEnabled(),
                overrides.revealVoiceLineUris(),
                overrides.revealRareWatermarkEnabled(),
                overrides.revealFeedTickerBlocklist(),
                overrides.revealRefreshRateHighScale(),
                overrides.revealRefreshRateLowScale(),
                overrides.revealDarkFlashScale(),
                overrides.revealFeedTickerTtlMs(),
                overrides.revealAtmosphereBuffEnabled(),
                overrides.revealAmbientTapParticlesEnabled(),
                overrides.revealActiveEventTagUri(),
                overrides.revealFestivalTemplateId(),
                overrides.revealShareTemplatePriority(),
                overrides.revealSessionIdleResetMs(),
                overrides.revealCeremonyTemplateId(),
                overrides.configVersion(),
                overrides.configTemplateId()
        );
    }

    private static void rejectDurationOutOfBounds(String field, int value, int max) {
        if (value < 0) {
            throw new BusinessException(field + " (" + value + ") must be >= 0");
        }
        if (value > max) {
            throw new BusinessException(field + " (" + value + ") exceeds max " + max);
        }
    }

    private static int clampMs(int value, int max) {
        if (value < 0) {
            return 0;
        }
        return Math.min(value, max);
    }

    private static RevealFieldOverrides validationDurationDefaults() {
        return new RevealFieldOverrides(
                0.0, 0.0, 0, 0.0, 0.0, 0.0, "", "", false, "", "", "",
                0, 0, 0, false, false, false, 0, 0, 0, 0.0, "", false, false, false,
                "", "", 0.0, 0.0, 0.0, 0, 0, 0, 0, 0.0, "", 0,
                "{}", 0, false, false, 0.0, "", false, 0, false, 0, 0,
                0, 0.0, false, "", false, "[]", 0.0, 0.0, 0.0, 0,
                false, false, "", "", 0, 0, "", null, null
        );
    }

    private static String defaultCeremonyTemplateId(String configTemplateId, String fallback) {
        String normalized = normalize(configTemplateId);
        if ("eyeCare".equals(normalized) || "collectMinimal".equals(normalized)) {
            return normalized;
        }
        return fallback;
    }

    private Optional<ConfigVersion> findPublishedVersion() {
        List<ConfigVersion> rows = jdbcTemplate.query(
                """
                        SELECT id, version_no, template_id, payload_json, status, created_by, created_at
                        FROM ops_app_config_version
                        WHERE status = ?
                        ORDER BY version_no DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> mapVersion(rs),
                STATUS_PUBLISHED
        );
        return rows.stream().findFirst();
    }

    private ConfigVersion getVersionById(String id) {
        try {
            return getVersion(id);
        } catch (BusinessException ex) {
            return null;
        }
    }

    private List<RolloutRule> listEnabledRollouts() {
        return jdbcTemplate.query(
                """
                        SELECT r.id, r.version_id, r.bucket_type, r.bucket_key, r.percentage, r.priority, r.enabled
                        FROM ops_app_config_rollout r
                        INNER JOIN ops_app_config_version v ON v.id = r.version_id
                        WHERE r.enabled = 1 AND v.status = ?
                        ORDER BY r.priority DESC, r.bucket_type ASC
                        """,
                (rs, rowNum) -> mapRollout(rs),
                STATUS_PUBLISHED
        );
    }

    private boolean matchesBucket(RolloutRule rollout,
                                  String userId,
                                  String boxId,
                                  String categoryId,
                                  String themeId) {
        return switch (normalizeBucketType(rollout.bucketType())) {
            case "GLOBAL" -> true;
            case "USER" -> matchesKey(rollout.bucketKey(), userId);
            case "BOX" -> matchesKey(rollout.bucketKey(), boxId);
            case "CATEGORY" -> matchesKey(rollout.bucketKey(), categoryId);
            case "THEME" -> matchesKey(rollout.bucketKey(), themeId);
            default -> false;
        };
    }

    private static boolean matchesKey(String bucketKey, String actual) {
        String key = normalize(bucketKey);
        if (!StringUtils.hasText(key) || "*".equals(key)) {
            return StringUtils.hasText(actual);
        }
        return key.equals(normalize(actual));
    }

    private static boolean passesPercentageGate(String userId, RolloutRule rollout) {
        int percentage = clampPercentage(rollout.percentage());
        if (percentage >= 100) {
            return true;
        }
        if (percentage <= 0) {
            return false;
        }
        String seed = String.join("|",
                Objects.toString(userId, "anonymous"),
                rollout.versionId(),
                rollout.bucketType(),
                rollout.bucketKey()
        );
        int bucket = Math.floorMod(seed.hashCode(), 100);
        return bucket < percentage;
    }

    private ResolvedRevealConfig toResolvedConfig(ConfigVersion version) {
        Map<String, Object> payload = parsePayload(version.payloadJson());
        return new ResolvedRevealConfig(
                String.valueOf(version.versionNo()),
                version.templateId(),
                payload
        );
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, MAP_TYPE);
        } catch (Exception ex) {
            throw new BusinessException("payloadJson 解析失败: " + ex.getMessage());
        }
    }

    private void validatePayloadJson(String payloadJson) {
        Map<String, Object> payload = parsePayload(payloadJson);
        validateRevealCrossFields(payload);
    }

    void validateRevealCrossFields(Map<String, Object> payload) {
        requireCrossFieldIntPair(
                payload,
                "revealFinalePauseMs", "finalePauseMs",
                "revealInterDrawDelayMs", "interDrawDelayMs",
                (finalePauseMs, interDrawDelayMs) -> finalePauseMs >= interDrawDelayMs,
                "finalePauseMs (%d) must be >= interDrawDelayMs (%d)"
        );
        requireCrossFieldIntPair(
                payload,
                "revealFinaleHoldMsExtra", "finaleHoldMsExtra",
                "revealSummaryHeroMs", "summaryHeroMs",
                (finaleHoldMsExtra, summaryHeroMs) -> finaleHoldMsExtra <= summaryHeroMs,
                "finaleHoldMsExtra (%d) must be <= summaryHeroMs (%d)"
        );
        requireCrossFieldIntPair(
                payload,
                "revealBatchRevealSize", "batchRevealSize",
                "revealBatchRevealThreshold", "batchRevealThreshold",
                (batchRevealSize, batchRevealThreshold) -> batchRevealSize <= batchRevealThreshold,
                "batchRevealSize (%d) must be <= batchRevealThreshold (%d)"
        );
        requireCrossFieldIntPair(
                payload,
                "revealReplayDegradeAfter", "replayDegradeAfter",
                "revealReplayDailyCap", "replayDailyCap",
                (revealReplayDegradeAfter, revealReplayDailyCap) -> revealReplayDegradeAfter <= revealReplayDailyCap,
                "revealReplayDegradeAfter (%d) must be <= revealReplayDailyCap (%d)"
        );
    }

    private static void requireCrossFieldIntPair(
            Map<String, Object> payload,
            String leftRevealKey,
            String leftPlainKey,
            String rightRevealKey,
            String rightPlainKey,
            IntPairPredicate constraint,
            String messageFormat
    ) {
        OptionalInt left = resolvePresentInt(payload, leftRevealKey, leftPlainKey);
        OptionalInt right = resolvePresentInt(payload, rightRevealKey, rightPlainKey);
        if (left.isEmpty() || right.isEmpty()) {
            return;
        }
        int leftValue = left.getAsInt();
        int rightValue = right.getAsInt();
        if (!constraint.test(leftValue, rightValue)) {
            throw new IllegalArgumentException(messageFormat.formatted(leftValue, rightValue));
        }
    }

    private static OptionalInt resolvePresentInt(Map<String, Object> payload, String revealKey, String plainKey) {
        Object value = payload.containsKey(revealKey) ? payload.get(revealKey) : payload.get(plainKey);
        if (value == null) {
            return OptionalInt.empty();
        }
        if (value instanceof Number number) {
            return OptionalInt.of(number.intValue());
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return OptionalInt.of(Integer.parseInt(text.trim()));
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("Invalid integer for " + revealKey + ": " + text);
            }
        }
        throw new IllegalArgumentException("Invalid integer for " + revealKey + ": " + value);
    }

    @FunctionalInterface
    private interface IntPairPredicate {
        boolean test(int left, int right);
    }

    private void validateRolloutInput(RolloutInput input) {
        if (!StringUtils.hasText(input.versionId())) {
            throw new BusinessException("versionId 不能为空");
        }
        normalizeBucketType(input.bucketType());
    }

    private int nextVersionNo() {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(version_no), 0) FROM ops_app_config_version",
                Integer.class
        );
        return max == null ? 1 : max + 1;
    }

    private void appendAudit(String versionId, String action, String operator, Map<String, Object> diff) {
        jdbcTemplate.update(
                """
                        INSERT INTO ops_app_config_audit_log
                        (id, version_id, action, operator, diff_json, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                newId(),
                versionId,
                action,
                normalize(operator),
                toJson(diff),
                LocalDateTime.now()
        );
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private ConfigVersion mapVersion(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ConfigVersion(
                rs.getString("id"),
                rs.getInt("version_no"),
                rs.getString("template_id"),
                rs.getString("payload_json"),
                rs.getString("status"),
                rs.getString("created_by"),
                rs.getTimestamp("created_at").toLocalDateTime()
        );
    }

    private RolloutRule mapRollout(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new RolloutRule(
                rs.getString("id"),
                rs.getString("version_id"),
                rs.getString("bucket_type"),
                rs.getString("bucket_key"),
                rs.getInt("percentage"),
                rs.getInt("priority"),
                rs.getBoolean("enabled")
        );
    }

    private static String newId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeBucketType(String bucketType) {
        String normalized = normalize(bucketType).toUpperCase();
        if (!normalized.matches("GLOBAL|USER|BOX|CATEGORY|THEME")) {
            throw new BusinessException("bucketType 无效: " + bucketType);
        }
        return normalized;
    }

    private static int clampPercentage(int percentage) {
        return Math.max(0, Math.min(100, percentage));
    }

    private static double pickDouble(Map<String, Object> payload, String key, double fallback) {
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private static int pickInt(Map<String, Object> payload, String key, int fallback) {
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private static boolean pickBoolean(Map<String, Object> payload, String key, boolean fallback) {
        Object value = payload.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text.trim());
        }
        return fallback;
    }

    private static String pickString(Map<String, Object> payload, String key, String fallback) {
        Object value = payload.get(key);
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return StringUtils.hasText(text) ? text : fallback;
    }

    private static String pickString(Map<String, Object> payload, String revealKey, String plainKey, String fallback) {
        if (payload.containsKey(revealKey)) {
            return pickString(payload, revealKey, fallback);
        }
        return pickString(payload, plainKey, fallback);
    }

    private static int pickInt(Map<String, Object> payload, String revealKey, String plainKey, int fallback) {
        if (payload.containsKey(revealKey)) {
            return pickInt(payload, revealKey, fallback);
        }
        return pickInt(payload, plainKey, fallback);
    }

    private static double pickDouble(Map<String, Object> payload, String revealKey, String plainKey, double fallback) {
        if (payload.containsKey(revealKey)) {
            return pickDouble(payload, revealKey, fallback);
        }
        return pickDouble(payload, plainKey, fallback);
    }

    private static boolean pickBoolean(Map<String, Object> payload, String revealKey, String plainKey, boolean fallback) {
        if (payload.containsKey(revealKey)) {
            return pickBoolean(payload, revealKey, fallback);
        }
        return pickBoolean(payload, plainKey, fallback);
    }

    private String pickJsonString(Map<String, Object> payload, String revealKey, String plainKey, String fallback) {
        Object value = payload.containsKey(revealKey) ? payload.get(revealKey) : payload.get(plainKey);
        if (value == null) {
            return fallback;
        }
        if (value instanceof String text) {
            return StringUtils.hasText(text.trim()) ? text.trim() : fallback;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static Map<String, Map<String, Object>> buildTemplatePresets() {
        Map<String, Map<String, Object>> templates = new LinkedHashMap<>();
        templates.put("lively", Map.ofEntries(
                Map.entry("revealParticleScale", 1.25),
                Map.entry("revealConfettiScale", 1.2),
                Map.entry("revealChargeScale", 1.15),
                Map.entry("revealFlashScale", 1.1),
                Map.entry("revealLustreScale", 1.2),
                Map.entry("revealFeedTickerEnabled", true),
                Map.entry("revealInterDrawDelayMs", 520),
                Map.entry("revealFinalePauseMs", 720),
                Map.entry("revealFinaleHoldMsExtra", 380),
                Map.entry("revealFinaleTeaserEnabled", true),
                Map.entry("revealSilenceBeforeFinaleMs", 260),
                Map.entry("revealSummaryHeroMs", 2100),
                Map.entry("reduceMotionLevel", "light"),
                Map.entry("comfortGapBoostMs", 140),
                Map.entry("cardBackPulseScale", 1.15)
        ));
        templates.put("minimal", Map.ofEntries(
                Map.entry("revealParticleScale", 0.75),
                Map.entry("revealConfettiScale", 0.6),
                Map.entry("revealChargeScale", 0.85),
                Map.entry("revealFlashScale", 0.8),
                Map.entry("revealLustreScale", 0.7),
                Map.entry("revealFeedTickerEnabled", false),
                Map.entry("revealInterDrawDelayMs", 320),
                Map.entry("revealFinalePauseMs", 420),
                Map.entry("revealFinaleHoldMsExtra", 180),
                Map.entry("revealFinaleTeaserEnabled", false),
                Map.entry("revealSilenceBeforeFinaleMs", 120),
                Map.entry("revealSummaryHeroMs", 1200),
                Map.entry("reduceMotionLevel", "heavy"),
                Map.entry("comfortGapBoostMs", 40),
                Map.entry("cardBackPulseScale", 0.6)
        ));
        templates.put("turbo", Map.ofEntries(
                Map.entry("revealParticleScale", 0.9),
                Map.entry("revealConfettiScale", 0.85),
                Map.entry("revealDelayMsOverride", 0),
                Map.entry("revealChargeScale", 0.7),
                Map.entry("revealFlashScale", 0.85),
                Map.entry("revealLustreScale", 0.9),
                Map.entry("revealFeedTickerEnabled", true),
                Map.entry("revealInterDrawDelayMs", 220),
                Map.entry("revealFinalePauseMs", 320),
                Map.entry("revealFinaleHoldMsExtra", 120),
                Map.entry("revealFinaleTeaserEnabled", true),
                Map.entry("revealSilenceBeforeFinaleMs", 80),
                Map.entry("revealSummaryHeroMs", 900),
                Map.entry("reduceMotionLevel", "medium"),
                Map.entry("comfortGapBoostMs", 60),
                Map.entry("cardBackPulseScale", 0.85)
        ));
        templates.put("eyeCare", Map.ofEntries(
                Map.entry("revealCeremonyTemplateId", "eyeCare"),
                Map.entry("revealParticleScale", 0.85),
                Map.entry("revealConfettiScale", 0.5),
                Map.entry("revealChargeScale", 0.9),
                Map.entry("revealFlashScale", 0.0),
                Map.entry("revealLustreScale", 0.75),
                Map.entry("revealFeedTickerEnabled", false),
                Map.entry("revealInterDrawDelayMs", 380),
                Map.entry("revealFinalePauseMs", 480),
                Map.entry("revealFinaleHoldMsExtra", 200),
                Map.entry("revealFinaleTeaserEnabled", false),
                Map.entry("finaleTeaserHapticEnabled", false),
                Map.entry("revealSilenceBeforeFinaleMs", 160),
                Map.entry("revealSummaryHeroMs", 1400),
                Map.entry("reduceMotionLevel", "heavy"),
                Map.entry("comfortGapBoostMs", 80),
                Map.entry("cardBackPulseScale", 1.05)
        ));
        templates.put("collectMinimal", Map.ofEntries(
                Map.entry("revealCeremonyTemplateId", "collectMinimal"),
                Map.entry("revealParticleScale", 0.4),
                Map.entry("revealConfettiScale", 0.35),
                Map.entry("revealChargeScale", 0.85),
                Map.entry("revealFlashScale", 0.5),
                Map.entry("revealLustreScale", 0.65),
                Map.entry("revealFeedTickerEnabled", false),
                Map.entry("revealInterDrawDelayMs", 300),
                Map.entry("revealFinalePauseMs", 400),
                Map.entry("revealFinaleHoldMsExtra", 160),
                Map.entry("revealFinaleTeaserEnabled", false),
                Map.entry("revealSilenceBeforeFinaleMs", 100),
                Map.entry("revealSummaryHeroMs", 1100),
                Map.entry("reduceMotionLevel", "heavy"),
                Map.entry("comfortGapBoostMs", 50),
                Map.entry("cardBackPulseScale", 1.35)
        ));
        return Map.copyOf(templates);
    }

    public record ResolvedRevealConfig(
            String configVersion,
            String configTemplateId,
            Map<String, Object> payload
    ) {
    }

    public record RevealFieldOverrides(
            double revealParticleScale,
            double revealConfettiScale,
            int revealDelayMsOverride,
            double revealChargeScale,
            double revealFlashScale,
            double revealLustreScale,
            String revealLustrePaletteId,
            String revealLustreBoxOverrides,
            boolean revealFeedTickerEnabled,
            String revealFeedTickerMinTier,
            String revealThemeId,
            String revealIntroVideoUri,
            int revealInterDrawDelayMs,
            int revealFinalePauseMs,
            int revealFinaleHoldMsExtra,
            boolean revealFinaleTeaserEnabled,
            boolean revealFinaleTeaserHapticEnabled,
            boolean revealFinaleTeaserSoundEnabled,
            int revealSilenceBeforeFinaleMs,
            int revealSummaryHeroMs,
            int revealComfortGapBoostMs,
            double revealCardBackPulseScale,
            String revealReduceMotionLevel,
            boolean revealHighlightsPanelEnabled,
            boolean revealBoxTapInteractionEnabled,
            boolean revealCollectionEasterEggEnabled,
            String revealTierElementFlags,
            String revealPhaseEasingPresets,
            double revealShortDrawSlowScale,
            double revealLongDrawFrontScale,
            double revealLongDrawFinaleScale,
            int revealBatchRevealThreshold,
            int revealBatchRevealSize,
            int revealActionLockMs,
            int revealExitSettleMs,
            double revealEffectVarianceScale,
            String revealLimitedThemeId,
            int revealLimitedThemePriority,
            String revealCopyPoolSizes,
            int revealAudioFadeOutMs,
            boolean revealVibrateFallbackEnabled,
            boolean revealFeedTickerTapEnabled,
            double revealFeedTickerPeakMultiplier,
            String revealBatchPreset,
            boolean revealBatchBeatEnabled,
            int revealBatchBeatMs,
            boolean revealAchievementHintsEnabled,
            int revealReplayDailyCap,
            int revealReplayDegradeAfter,
            int revealBackgroundResumeMaxMs,
            double revealCompactRevealScale,
            boolean revealBoxDragInteractionEnabled,
            String revealVoiceLineUris,
            boolean revealRareWatermarkEnabled,
            String revealFeedTickerBlocklist,
            double revealRefreshRateHighScale,
            double revealRefreshRateLowScale,
            double revealDarkFlashScale,
            int revealFeedTickerTtlMs,
            boolean revealAtmosphereBuffEnabled,
            boolean revealAmbientTapParticlesEnabled,
            String revealActiveEventTagUri,
            String revealFestivalTemplateId,
            int revealShareTemplatePriority,
            int revealSessionIdleResetMs,
            String revealCeremonyTemplateId,
            String configVersion,
            String configTemplateId
    ) {
    }

    public record ConfigVersion(
            String id,
            int versionNo,
            String templateId,
            String payloadJson,
            String status,
            String createdBy,
            LocalDateTime createdAt
    ) {
    }

    public record VersionInput(
            String templateId,
            String payloadJson
    ) {
    }

    public record RolloutRule(
            String id,
            String versionId,
            String bucketType,
            String bucketKey,
            int percentage,
            int priority,
            boolean enabled
    ) {
    }

    public record RolloutInput(
            String versionId,
            String bucketType,
            String bucketKey,
            int percentage,
            int priority,
            boolean enabled
    ) {
    }

    public record ConfigTemplate(
            String templateId,
            String payloadJson
    ) {
    }

    public record AuditLogEntry(
            String id,
            String versionId,
            String action,
            String operator,
            String diffJson,
            LocalDateTime createdAt
    ) {
    }
}

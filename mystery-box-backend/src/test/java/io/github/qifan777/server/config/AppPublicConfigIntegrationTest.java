package io.github.qifan777.server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.ops.service.AppRevealConfigService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class AppPublicConfigIntegrationTest {

    @Autowired(required = false)
    private AppPublicConfigController controller;

    @Autowired(required = false)
    private AppRevealConfigService appRevealConfigService;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Autowired(required = false)
    private ObjectMapper objectMapper;

    @Test
    void publicConfigEndpointReturnsValues() {
        assertThat(controller).isNotNull();
        AppPublicConfigController.AppConfigView view = controller.config(null, null, null);
        assertThat(view.supportHotline()).isNotNull();
        assertThat(view.enterpriseWechat()).isNotNull();
        assertThat(view.revealParticleScale()).isGreaterThan(0);
        assertThat(view.revealConfettiScale()).isGreaterThan(0);
        assertThat(view.revealDelayMsOverride()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealChargeScale()).isGreaterThan(0);
        assertThat(view.revealFlashScale()).isGreaterThan(0);
        assertThat(view.revealLustreScale()).isGreaterThan(0);
        assertThat(view.revealInterDrawDelayMs()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealFinalePauseMs()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealSummaryHeroMs()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealActionLockMs()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealReduceMotionLevel()).isNotBlank();
        assertThat(view.revealCopyPoolSizes()).isNotBlank();
        assertThat(view.revealBatchPreset()).isIn("default", "medium20", "mega50");
        assertThat(view.revealBatchBeatMs()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealReplayDailyCap()).isGreaterThan(0);
        assertThat(view.revealReplayDegradeAfter()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealBackgroundResumeMaxMs()).isGreaterThan(0);
        assertThat(view.revealCompactRevealScale()).isBetween(0.0, 2.0);
        assertThat(view.revealVoiceLineUris()).isNotNull();
        assertThat(view.revealFeedTickerBlocklist()).isNotNull();
        assertThat(view.revealRefreshRateHighScale()).isBetween(0.0, 2.0);
        assertThat(view.revealRefreshRateLowScale()).isBetween(0.0, 2.0);
        assertThat(view.revealDarkFlashScale()).isBetween(0.0, 1.0);
        assertThat(view.revealFeedTickerTtlMs()).isGreaterThan(0);
        assertThat(view.revealActiveEventTagUri()).isNotNull();
        assertThat(view.revealFestivalTemplateId()).isNotNull();
        assertThat(view.revealShareTemplatePriority()).isGreaterThanOrEqualTo(0);
        assertThat(view.revealSessionIdleResetMs()).isGreaterThan(0);
        assertThat(view.paymentProvider()).isNotNull();
        assertThat(view.currency()).isNotNull();
        assertThat(view.featureFlags()).isNotNull();
    }

    @Test
    void publicConfigAcceptsOptionalContextParams() {
        assertThat(controller).isNotNull();
        AppPublicConfigController.AppConfigView view = controller.config("box-test-1", "category-test-1", "theme-test-1");
        assertThat(view.revealParticleScale()).isGreaterThan(0);
        assertThat(view.revealConfettiScale()).isGreaterThan(0);
        assertThat(view.featureFlags()).isNotNull();
    }

    @Test
    void publishedRevealConfigOverridesYamlDefaultsWhenDbAvailable() throws Exception {
        Assumptions.assumeTrue(controller != null && appRevealConfigService != null && jdbcTemplate != null && objectMapper != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }

        String payloadJson = objectMapper.writeValueAsString(java.util.Map.of(
                "revealParticleScale", 1.42,
                "revealConfettiScale", 1.33,
                "revealInterDrawDelayMs", 777,
                "actionLockMs", 450,
                "reduceMotionLevel", "heavy",
                "batchPreset", "medium20",
                "batchBeatMs", 1100,
                "achievementHintsEnabled", false,
                "replayDailyCap", 15,
                "rareWatermarkEnabled", false
        ));
        AppRevealConfigService.ConfigVersion previousPublished = appRevealConfigService.listVersions().stream()
                .filter(version -> AppRevealConfigService.STATUS_PUBLISHED.equals(version.status()))
                .findFirst()
                .orElse(null);
        AppRevealConfigService.ConfigVersion draft = appRevealConfigService.createVersion(
                new AppRevealConfigService.VersionInput("turbo", payloadJson),
                "integration-test"
        );
        try {
            appRevealConfigService.publishVersion(draft.id(), "integration-test");

            AppPublicConfigController.AppConfigView view = controller.config(null, null, null);
            assertThat(view.configVersion()).isEqualTo(String.valueOf(draft.versionNo()));
            assertThat(view.configTemplateId()).isEqualTo("turbo");
            assertThat(view.revealParticleScale()).isEqualTo(1.42);
            assertThat(view.revealConfettiScale()).isEqualTo(1.33);
            assertThat(view.revealInterDrawDelayMs()).isEqualTo(777);
            assertThat(view.revealActionLockMs()).isEqualTo(450);
            assertThat(view.revealReduceMotionLevel()).isEqualTo("heavy");
            assertThat(view.revealBatchPreset()).isEqualTo("medium20");
            assertThat(view.revealBatchBeatMs()).isEqualTo(1100);
            assertThat(view.revealAchievementHintsEnabled()).isFalse();
            assertThat(view.revealReplayDailyCap()).isEqualTo(15);
            assertThat(view.revealRareWatermarkEnabled()).isFalse();
        } finally {
            if (previousPublished != null) {
                appRevealConfigService.rollback("integration-test");
            } else {
                jdbcTemplate.update(
                        "UPDATE ops_app_config_version SET status = ? WHERE id = ?",
                        AppRevealConfigService.STATUS_ARCHIVED,
                        draft.id()
                );
            }
            jdbcTemplate.update("DELETE FROM ops_app_config_rollout WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_audit_log WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_version WHERE id = ?", draft.id());
        }
    }

    @Test
    void rejectsInvalidRevealCrossFieldConfig() throws Exception {
        Assumptions.assumeTrue(appRevealConfigService != null && jdbcTemplate != null && objectMapper != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }

        String payloadJson = objectMapper.writeValueAsString(java.util.Map.of(
                "revealInterDrawDelayMs", 800,
                "revealFinalePauseMs", 500
        ));
        assertThatThrownBy(() -> appRevealConfigService.createVersion(
                new AppRevealConfigService.VersionInput("turbo", payloadJson),
                "integration-test"
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("finalePauseMs (500) must be >= interDrawDelayMs (800)");
    }

    @Test
    void templatesExposeLivelyMinimalTurboPresets() {
        Assumptions.assumeTrue(appRevealConfigService != null);
        var templates = appRevealConfigService.listTemplates();
        assertThat(templates).extracting(AppRevealConfigService.ConfigTemplate::templateId)
                .containsExactly("lively", "minimal", "turbo", "eyeCare", "collectMinimal");
        assertThat(templates.get(0).payloadJson()).contains("revealParticleScale");
        assertThat(templates.stream()
                .filter(t -> "eyeCare".equals(t.templateId()))
                .findFirst()
                .orElseThrow()
                .payloadJson()).contains("revealCeremonyTemplateId");
    }

    @Test
    void exportVersionJsonReturnsValidPayload() throws Exception {
        Assumptions.assumeTrue(appRevealConfigService != null && jdbcTemplate != null && objectMapper != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }

        String payloadJson = objectMapper.writeValueAsString(java.util.Map.of(
                "revealParticleScale", 1.05,
                "revealInterDrawDelayMs", 400,
                "revealFinalePauseMs", 500
        ));
        AppRevealConfigService.ConfigVersion draft = appRevealConfigService.createVersion(
                new AppRevealConfigService.VersionInput("eyeCare", payloadJson),
                "integration-test"
        );
        try {
            java.util.Map<String, Object> exported = appRevealConfigService.exportVersionJson(draft.id());
            assertThat(exported).containsKeys("id", "versionNo", "templateId", "status", "payload");
            assertThat(exported.get("id")).isEqualTo(draft.id());
            assertThat(exported.get("templateId")).isEqualTo("eyeCare");
            assertThat(exported.get("payload")).isInstanceOf(java.util.Map.class);
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> payload = (java.util.Map<String, Object>) exported.get("payload");
            assertThat(payload.get("revealParticleScale")).isEqualTo(1.05);
            assertThat(objectMapper.writeValueAsString(exported)).contains("\"payload\"");
        } finally {
            jdbcTemplate.update("DELETE FROM ops_app_config_rollout WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_audit_log WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_version WHERE id = ?", draft.id());
        }
    }

    @Test
    void exportTemplateJsonReturnsValidPreset() throws Exception {
        Assumptions.assumeTrue(appRevealConfigService != null);
        java.util.Map<String, Object> exported = appRevealConfigService.exportTemplateJson("collectMinimal");
        assertThat(exported).containsKeys("templateId", "payload");
        assertThat(exported.get("templateId")).isEqualTo("collectMinimal");
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> payload = (java.util.Map<String, Object>) exported.get("payload");
        assertThat(payload.get("revealCeremonyTemplateId")).isEqualTo("collectMinimal");
        assertThat(objectMapper.writeValueAsString(exported)).contains("revealParticleScale");
    }

    @Test
    void mergeRevealFieldsDefaultsCeremonyTemplateFromConfigTemplate() {
        Assumptions.assumeTrue(appRevealConfigService != null);
        AppRevealConfigService.RevealFieldOverrides defaults = new AppRevealConfigService.RevealFieldOverrides(
                1.0, 1.0, 0, 1.0, 1.0, 1.0, "", "", true, "HIDDEN", "", "", 450, 600, 300,
                true, true, true, 220, 1800, 100, 1.0, "medium", false, true, true,
                "", "", 1.12, 0.88, 1.08, 24, 8, 320, 180, 0.15, "", 0,
                "{}", 120, true, true, 1.35, "default", true, 900, true, 20, 12,
                120000, 0.82, true, "", true, "[]", 0.94, 1.04, 0.6, 86400000,
                false, true, "", "", 0, 1800000, "standard", null, null
        );
        AppRevealConfigService.ResolvedRevealConfig resolved = new AppRevealConfigService.ResolvedRevealConfig(
                "1", "eyeCare", java.util.Map.of("revealParticleScale", 0.85)
        );
        AppRevealConfigService.RevealFieldOverrides merged = appRevealConfigService.mergeRevealFields(defaults, resolved);
        assertThat(merged.revealCeremonyTemplateId()).isEqualTo("eyeCare");
    }

    @Test
    void mergeRevealFieldsClampsDurationOverridesToMobileBounds() {
        Assumptions.assumeTrue(appRevealConfigService != null);
        AppRevealConfigService.RevealFieldOverrides defaults = new AppRevealConfigService.RevealFieldOverrides(
                1.0, 1.0, 20_000, 1.0, 1.0, 1.0, "", "", true, "HIDDEN", "", "", 450, 600, 300,
                true, true, true, 220, 1800, 100, 1.0, "medium", false, true, true,
                "", "", 1.12, 0.88, 1.08, 24, 8, 320, 180, 0.15, "", 0,
                "{}", 120, true, true, 1.35, "default", true, 900, true, 20, 12,
                120000, 0.82, true, "", true, "[]", 0.94, 1.04, 0.6, 86400000,
                false, true, "", "", 0, 1800000, "standard", null, null
        );
        AppRevealConfigService.ResolvedRevealConfig resolved = new AppRevealConfigService.ResolvedRevealConfig(
                "1",
                "turbo",
                java.util.Map.of(
                        "revealDelayMsOverride", 20_000,
                        "revealInterDrawDelayMs", 9_000,
                        "revealFinalePauseMs", 9_500,
                        "revealFinaleHoldMsExtra", 8_500,
                        "revealSilenceBeforeFinaleMs", 7_500,
                        "revealSummaryHeroMs", 13_000
                )
        );

        AppRevealConfigService.RevealFieldOverrides merged = appRevealConfigService.mergeRevealFields(defaults, resolved);

        assertThat(merged.revealDelayMsOverride()).isEqualTo(AppRevealConfigService.MAX_REVEAL_DELAY_MS_OVERRIDE);
        assertThat(merged.revealInterDrawDelayMs()).isEqualTo(AppRevealConfigService.MAX_REVEAL_STEP_MS);
        assertThat(merged.revealFinalePauseMs()).isEqualTo(AppRevealConfigService.MAX_REVEAL_STEP_MS);
        assertThat(merged.revealFinaleHoldMsExtra()).isEqualTo(AppRevealConfigService.MAX_REVEAL_STEP_MS);
        assertThat(merged.revealSilenceBeforeFinaleMs()).isEqualTo(7_500);
        assertThat(merged.revealSummaryHeroMs()).isEqualTo(AppRevealConfigService.MAX_REVEAL_SUMMARY_HERO_MS);
    }

    @Test
    void publishVersionRejectsOutOfBoundsRevealDurationsAndAudits() throws Exception {
        Assumptions.assumeTrue(appRevealConfigService != null && jdbcTemplate != null && objectMapper != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }

        String payloadJson = objectMapper.writeValueAsString(java.util.Map.of(
                "revealInterDrawDelayMs", 500,
                "revealFinalePauseMs", 600,
                "revealSummaryHeroMs", 20_000
        ));
        AppRevealConfigService.ConfigVersion draft = appRevealConfigService.createVersion(
                new AppRevealConfigService.VersionInput("turbo", payloadJson),
                "integration-test"
        );
        try {
            assertThatThrownBy(() -> appRevealConfigService.publishVersion(draft.id(), "integration-test"))
                    .isInstanceOf(io.qifan.infrastructure.common.exception.BusinessException.class)
                    .hasMessageContaining("revealSummaryHeroMs (20000) exceeds max 12000");

            Integer rejectedCount = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM ops_app_config_audit_log
                            WHERE version_id = ? AND action = ?
                            """,
                    Integer.class,
                    draft.id(),
                    "PUBLISH_REJECTED"
            );
            assertThat(rejectedCount).isEqualTo(1);
        } finally {
            jdbcTemplate.update("DELETE FROM ops_app_config_rollout WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_audit_log WHERE version_id = ?", draft.id());
            jdbcTemplate.update("DELETE FROM ops_app_config_version WHERE id = ?", draft.id());
        }
    }
}

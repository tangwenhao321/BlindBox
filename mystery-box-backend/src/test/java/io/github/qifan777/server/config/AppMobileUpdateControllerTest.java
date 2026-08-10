package io.github.qifan777.server.config;

import io.github.qifan777.server.appversion.service.AppVersionReleaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AppMobileUpdateControllerTest {

    private final AppVersionReleaseService appVersionReleaseService = mock(AppVersionReleaseService.class);
    private final AppMobileUpdateController controller = new AppMobileUpdateController(appVersionReleaseService);

    @BeforeEach
    void setUp() {
        when(appVersionReleaseService.resolvePublished(any(), any())).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(controller, "androidVersionCode", 2);
        ReflectionTestUtils.setField(controller, "androidVersionName", "1.0.1");
        ReflectionTestUtils.setField(controller, "androidDownloadUrl", "http://example.com/app.apk");
        ReflectionTestUtils.setField(controller, "androidForceUpdate", false);
        ReflectionTestUtils.setField(controller, "androidReleaseNotes", "Bug fixes");
        ReflectionTestUtils.setField(controller, "androidMinSupportedVersionCode", 0);
    }

    @Test
    void updateCheck_returnsUpdateWhenLocalIsOlder() {
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("android", 1, "test");
        assertThat(view.hasUpdate()).isTrue();
        assertThat(view.versionCode()).isEqualTo(2);
        assertThat(view.versionName()).isEqualTo("1.0.1");
        assertThat(view.downloadUrl()).contains("app.apk");
        assertThat(view.releaseNotes()).isEqualTo("Bug fixes");
    }

    @Test
    void updateCheck_noUpdateWhenUpToDate() {
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("android", 2, null);
        assertThat(view.hasUpdate()).isFalse();
    }

    @Test
    void updateCheck_noUpdateForNonAndroid() {
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("ios", 1, null);
        assertThat(view.hasUpdate()).isFalse();
    }

    @Test
    void updateCheck_forcesUpdateBelowMinSupportedVersion() {
        ReflectionTestUtils.setField(controller, "androidMinSupportedVersionCode", 2);
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("android", 1, null);
        assertThat(view.hasUpdate()).isTrue();
        assertThat(view.forceUpdate()).isTrue();
        assertThat(view.minSupportedVersionCode()).isEqualTo(2);
    }

    @Test
    void updateCheck_prefersPublishedReleaseOverStaticConfig() {
        when(appVersionReleaseService.resolvePublished("android", "production"))
                .thenReturn(Optional.of(release(9, "1.2.0", false, 0)));
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("android", 6, "production");
        assertThat(view.hasUpdate()).isTrue();
        assertThat(view.versionCode()).isEqualTo(9);
        assertThat(view.versionName()).isEqualTo("1.2.0");
        assertThat(view.forceUpdate()).isFalse();
    }

    @Test
    void updateCheck_supportsIosWhenReleasePublished() {
        when(appVersionReleaseService.resolvePublished("ios", null))
                .thenReturn(Optional.of(release(3, "1.0.3", true, 0)));
        AppMobileUpdateController.AppUpdateCheckView view = controller.updateCheck("ios", 1, null);
        assertThat(view.hasUpdate()).isTrue();
        assertThat(view.forceUpdate()).isTrue();
    }

    private static AppVersionReleaseService.Release release(
            int versionCode,
            String versionName,
            boolean forceUpdate,
            int minSupportedVersionCode
    ) {
        return new AppVersionReleaseService.Release(
                "rel-" + versionCode,
                "android",
                "production",
                versionCode,
                versionName,
                "http://example.com/app-" + versionCode + ".apk",
                forceUpdate,
                minSupportedVersionCode,
                "notes",
                "",
                "",
                true,
                AppVersionReleaseService.STATUS_PUBLISHED,
                LocalDateTime.now(),
                null,
                0,
                "admin",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}

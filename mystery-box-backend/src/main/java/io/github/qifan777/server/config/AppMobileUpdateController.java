package io.github.qifan777.server.config;

import io.github.qifan777.server.appversion.service.AppVersionReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("front/app")
@RequiredArgsConstructor
public class AppMobileUpdateController {

    private final AppVersionReleaseService appVersionReleaseService;

    @Value("${app.mobile-update.android-version-code:0}")
    private int androidVersionCode;

    @Value("${app.mobile-update.android-version-name:}")
    private String androidVersionName;

    @Value("${app.mobile-update.android-download-url:}")
    private String androidDownloadUrl;

    @Value("${app.mobile-update.android-force-update:false}")
    private boolean androidForceUpdate;

    @Value("${app.mobile-update.android-release-notes:}")
    private String androidReleaseNotes;

    @Value("${app.mobile-update.android-min-supported-version-code:0}")
    private int androidMinSupportedVersionCode;

    @GetMapping("update-check")
    public AppUpdateCheckView updateCheck(
            @RequestParam(defaultValue = "android") String platform,
            @RequestParam(defaultValue = "0") int versionCode,
            @RequestParam(required = false) String channel
    ) {
        Optional<AppVersionReleaseService.Release> published =
                appVersionReleaseService.resolvePublished(platform, channel);
        if (published.isPresent()) {
            return buildView(published.get(), versionCode);
        }
        // No managed release for this platform/channel: fall back to the legacy env-var config,
        // which only ever covered Android.
        if (!"android".equalsIgnoreCase(platform)) {
            return AppUpdateCheckView.noUpdate();
        }
        return buildLegacyView(versionCode);
    }

    private AppUpdateCheckView buildView(AppVersionReleaseService.Release release, int versionCode) {
        if (release.versionCode() <= 0 || !StringUtils.hasText(release.downloadUrl())) {
            return AppUpdateCheckView.noUpdate();
        }
        if (versionCode >= release.versionCode()) {
            return AppUpdateCheckView.noUpdate();
        }
        int minSupported = Math.max(0, release.minSupportedVersionCode());
        boolean forceUpdate = release.forceUpdate() || (minSupported > 0 && versionCode < minSupported);
        return new AppUpdateCheckView(
                true,
                forceUpdate,
                release.versionCode(),
                StringUtils.hasText(release.versionName())
                        ? release.versionName()
                        : String.valueOf(release.versionCode()),
                release.downloadUrl(),
                release.releaseNotes(),
                minSupported
        );
    }

    private AppUpdateCheckView buildLegacyView(int versionCode) {
        if (androidVersionCode <= 0 || !StringUtils.hasText(androidDownloadUrl)) {
            return AppUpdateCheckView.noUpdate();
        }
        if (versionCode >= androidVersionCode) {
            return AppUpdateCheckView.noUpdate();
        }
        int minSupported = Math.max(0, androidMinSupportedVersionCode);
        boolean forceUpdate = androidForceUpdate || (minSupported > 0 && versionCode < minSupported);
        return new AppUpdateCheckView(
                true,
                forceUpdate,
                androidVersionCode,
                StringUtils.hasText(androidVersionName) ? androidVersionName.trim() : String.valueOf(androidVersionCode),
                androidDownloadUrl.trim(),
                androidReleaseNotes == null ? "" : androidReleaseNotes.trim(),
                minSupported
        );
    }

    public record AppUpdateCheckView(
            boolean hasUpdate,
            boolean forceUpdate,
            int versionCode,
            String versionName,
            String downloadUrl,
            String releaseNotes,
            int minSupportedVersionCode
    ) {
        static AppUpdateCheckView noUpdate() {
            return new AppUpdateCheckView(false, false, 0, "", "", "", 0);
        }
    }
}

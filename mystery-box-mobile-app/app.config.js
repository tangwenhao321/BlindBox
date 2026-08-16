/** @type {import('expo/config').ExpoConfig} */
const rawLinkDomain = process.env.EXPO_PUBLIC_APP_LINK_DOMAIN?.trim() || "";
const isPlaceholderDomain =
  !rawLinkDomain ||
  rawLinkDomain.includes("example.com") ||
  rawLinkDomain.includes("your-domain");
const linkDomain = isPlaceholderDomain ? "" : rawLinkDomain;
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const isTestVariant = process.env.EXPO_PUBLIC_APP_VARIANT === "test";
const isVnVariant = process.env.EXPO_PUBLIC_APP_VARIANT === "production-vn";

const faceIdPermission =
  process.env.EXPO_PUBLIC_FACE_ID_PERMISSION?.trim() ||
  (isVnVariant
    ? "Night Cabinet có thể dùng Face ID để xác minh nhanh khi bạn bật khóa sinh trắc trong Cài đặt."
    : "Night Cabinet may use Face ID for quick verification when you enable biometric lock in Settings.");
const photosPermission =
  process.env.EXPO_PUBLIC_PHOTOS_PERMISSION?.trim() ||
  (isVnVariant
    ? "Night Cabinet cần quyền ảnh để đặt ảnh đại diện, đăng bài và lưu highlight mở hộp."
    : "Night Cabinet needs photo access so you can set an avatar, share posts, and save reveal highlights.");
const photosAddPermission =
  process.env.EXPO_PUBLIC_PHOTOS_ADD_PERMISSION?.trim() ||
  (isVnVariant
    ? "Night Cabinet cần quyền lưu video highlight mở hộp vào thư viện ảnh."
    : "Night Cabinet needs permission to save reveal highlight videos to your photo library.");

const plugins = [
  "expo-router",
  "expo-audio",
  "expo-sharing",
  "expo-asset",
  ["expo-system-ui", { backgroundColor: "#14110F" }],
  "@react-native-community/datetimepicker",
  "expo-localization",
  [
    "expo-notifications",
    {
      icon: "./assets/notification-icon.png",
      color: "#C4A574",
    },
  ],
  [
    "expo-local-authentication",
    {
      faceIDPermission: faceIdPermission,
    },
  ],
  [
    "expo-image-picker",
    {
      photosPermission,
    },
  ],
  [
    "expo-media-library",
    {
      photosPermission,
      savePhotosPermission: photosAddPermission,
      isAccessMediaLocationEnabled: false,
    },
  ],
];

if (sentryDsn) {
  plugins.push([
    "@sentry/react-native/expo",
    {
      url: process.env.SENTRY_URL || "https://sentry.io/",
      organization: process.env.SENTRY_ORG || undefined,
      project: process.env.SENTRY_PROJECT || undefined,
    },
  ]);
}

// Required by Expo Notifications getExpoPushTokenAsync on SDK 49+.
// Override with EXPO_PUBLIC_EAS_PROJECT_ID when the EAS project id differs per environment.
const PLACEHOLDER_EAS_PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  process.env.EAS_PROJECT_ID?.trim() ||
  PLACEHOLDER_EAS_PROJECT_ID;

const appVariant =
  process.env.EXPO_PUBLIC_APP_VARIANT?.trim() ||
  (isTestVariant ? "test" : "production");

const releaseVariants = new Set(["production", "production-vn", "test"]);
const mustHaveRealProjectId =
  process.env.EAS_BUILD === "true" ||
  releaseVariants.has(process.env.EXPO_PUBLIC_APP_VARIANT?.trim() || "");

if (
  mustHaveRealProjectId &&
  (!easProjectId || easProjectId === PLACEHOLDER_EAS_PROJECT_ID)
) {
  throw new Error(
    "EXPO_PUBLIC_EAS_PROJECT_ID (or EAS_PROJECT_ID) must be set to a real EAS project id for this build/variant",
  );
}

function isMissingLegalUrl(raw) {
  const v = (raw || "").trim();
  return !v || /example\.com|your-domain|localhost/i.test(v);
}

function isUnsafeApiBaseUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return true;
  return /example\.com|your-domain|localhost|127\.0\.0\.1/i.test(v);
}

const productionLikeVariants = new Set(["production", "production-vn"]);
if (
  process.env.EAS_BUILD === "true" &&
  productionLikeVariants.has(process.env.EXPO_PUBLIC_APP_VARIANT?.trim() || "")
) {
  if (isUnsafeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)) {
    throw new Error(
      "EAS production builds require EXPO_PUBLIC_API_BASE_URL set to a real HTTPS API host (not empty, localhost, or example.com). Configure via EAS secrets/env.",
    );
  }
  if (process.env.EXPO_PUBLIC_MOCK_PAYMENT === "true") {
    throw new Error(
      "EAS production builds must not enable EXPO_PUBLIC_MOCK_PAYMENT=true",
    );
  }
}

if (process.env.EAS_BUILD === "true" && isVnVariant) {
  const missing = [];
  if (isMissingLegalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL)) missing.push("EXPO_PUBLIC_PRIVACY_URL");
  if (isMissingLegalUrl(process.env.EXPO_PUBLIC_TERMS_URL)) missing.push("EXPO_PUBLIC_TERMS_URL");
  if (isMissingLegalUrl(process.env.EXPO_PUBLIC_MINOR_DECLARATION_URL)) {
    missing.push("EXPO_PUBLIC_MINOR_DECLARATION_URL");
  }
  if (isMissingLegalUrl(process.env.EXPO_PUBLIC_APP_LINK_DOMAIN)) {
    missing.push("EXPO_PUBLIC_APP_LINK_DOMAIN");
  }
  if (
    !(process.env.EXPO_PUBLIC_SUPPORT_PHONE || "").trim() &&
    !(process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "").trim()
  ) {
    missing.push("EXPO_PUBLIC_SUPPORT_PHONE|EMAIL");
  }
  if (missing.length) {
    throw new Error(
      `production-vn EAS build requires legal/support env: ${missing.join(", ")}`,
    );
  }
}

const displayName = isTestVariant
  ? isVnVariant
    ? "Mystery Box Test"
    : "神秘盲盒测"
  : isVnVariant
    ? "Mystery Box"
    : "神秘盲盒";

const iosConfig = {
  supportsTablet: false,
  bundleIdentifier: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
  backgroundColor: "#14110F",
  infoPlist: {
    UIBackgroundModes: ["remote-notification"],
    UIStatusBarStyle: "UIStatusBarStyleLightContent",
    ITSAppUsesNonExemptEncryption: false,
    NSFaceIDUsageDescription: faceIdPermission,
    NSPhotoLibraryUsageDescription: photosPermission,
    NSPhotoLibraryAddUsageDescription: photosAddPermission,
    LSApplicationQueriesSchemes: isVnVariant
      ? ["momo", "momopay", "vnpay", "vnpaymerchant", "zalopay", "zalo"]
      : ["momo", "momopay", "vnpay", "vnpaymerchant", "weixin", "wechat", "zalopay", "zalo"],
  },
  privacyManifests: {
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
        NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
        NSPrivacyAccessedAPITypeReasons: ["C617.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
        NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
      },
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
        NSPrivacyAccessedAPITypeReasons: ["E174.1"],
      },
    ],
  },
};

if (linkDomain) {
  iosConfig.associatedDomains = [`applinks:${linkDomain}`];
}

module.exports = {
  expo: {
    name: displayName,
    slug: isTestVariant ? "mystery-box-mobile-test" : "mystery-box-mobile",
    version: "1.1.9",
    icon: "./assets/icon.png",
    orientation: "portrait",
    // Splash / native chrome defaults to night cabinet (#14110F).
    // Runtime statusBar + nav bar follow ThemeContext via AppChrome (cannot be fully dynamic in static expo config).
    userInterfaceStyle: "automatic",
    scheme: "mysterybox",
    assetBundlePatterns: ["**/*"],
    plugins,
    extra: {
      eas: {
        projectId: easProjectId,
      },
      appVariant,
    },
    owner: process.env.EXPO_OWNER || undefined,
    ios: iosConfig,
    android: {
      package: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
      versionCode: 20,
      backgroundColor: "#14110F",
      statusBar: {
        backgroundColor: "#14110F",
        barStyle: "light-content",
        translucent: false,
      },
      navigationBar: {
        backgroundColor: "#14110F",
      },
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#14110F",
      },
      intentFilters: linkDomain
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                { scheme: "https", host: linkDomain, pathPrefix: "/invite" },
                { scheme: "https", host: linkDomain, pathPrefix: "/order" },
                { scheme: "https", host: linkDomain, pathPrefix: "/box" },
              ],
              category: ["BROWSABLE", "DEFAULT"],
            },
            {
              action: "VIEW",
              data: [{ scheme: "mysterybox" }],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ]
        : [
            {
              action: "VIEW",
              data: [{ scheme: "mysterybox" }],
              category: ["BROWSABLE", "DEFAULT"],
            },
          ],
    },
  },
};

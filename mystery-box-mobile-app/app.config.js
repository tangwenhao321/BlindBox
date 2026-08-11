/** @type {import('expo/config').ExpoConfig} */
const linkDomain = process.env.EXPO_PUBLIC_APP_LINK_DOMAIN || "mysterybox.example.com";
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const isTestVariant = process.env.EXPO_PUBLIC_APP_VARIANT === "test";

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
      icon: "./assets/icon.png",
      color: "#ffffff",
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

module.exports = {
  expo: {
    name: isTestVariant ? "夜市珍宝柜·测试" : "夜市珍宝柜",
    slug: isTestVariant ? "mystery-box-mobile-test" : "mystery-box-mobile",
    version: "1.0.5",
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
    ios: {
      supportsTablet: true,
      bundleIdentifier: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
      backgroundColor: "#14110F",
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        UIStatusBarStyle: "UIStatusBarStyleLightContent",
      },
      associatedDomains: [`applinks:${linkDomain}`],
    },
    android: {
      package: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
      versionCode: 6,
      backgroundColor: "#14110F",
      statusBar: {
        backgroundColor: "#14110F",
        barStyle: "light-content",
        translucent: false,
      },
      navigationBar: {
        backgroundColor: "#14110F",
        barStyle: "light-content",
      },
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#14110F",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: linkDomain,
              pathPrefix: "/invite",
            },
            {
              scheme: "https",
              host: linkDomain,
              pathPrefix: "/order",
            },
            {
              scheme: "https",
              host: linkDomain,
              pathPrefix: "/box",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          data: [{ scheme: "mysterybox" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
  },
};

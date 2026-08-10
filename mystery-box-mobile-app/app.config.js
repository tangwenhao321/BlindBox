/** @type {import('expo/config').ExpoConfig} */
const linkDomain = process.env.EXPO_PUBLIC_APP_LINK_DOMAIN || "mysterybox.example.com";
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const isTestVariant = process.env.EXPO_PUBLIC_APP_VARIANT === "test";

const plugins = [
  "expo-router",
  "expo-audio",
  "expo-sharing",
  "expo-asset",
  ["expo-system-ui", { backgroundColor: "#F3F2FF" }],
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

module.exports = {
  expo: {
    name: isTestVariant ? "神秘盲盒·测试" : "神秘盲盒",
    slug: isTestVariant ? "mystery-box-mobile-test" : "mystery-box-mobile",
    version: "1.0.5",
    icon: "./assets/icon.png",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "mysterybox",
    assetBundlePatterns: ["**/*"],
    plugins,
    ios: {
      supportsTablet: true,
      bundleIdentifier: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
      backgroundColor: "#F3F2FF",
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        UIStatusBarStyle: "UIStatusBarStyleDarkContent",
      },
      associatedDomains: [`applinks:${linkDomain}`],
    },
    android: {
      package: isTestVariant ? "com.mysterybox.mobile.test" : "com.mysterybox.mobile",
      versionCode: 6,
      backgroundColor: "#F3F2FF",
      statusBar: {
        backgroundColor: "#F3F2FF",
        barStyle: "dark-content",
        translucent: false,
      },
      navigationBar: {
        backgroundColor: "#F3F2FF",
        barStyle: "dark-content",
      },
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#6B4EFF",
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

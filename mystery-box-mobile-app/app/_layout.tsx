import "../src/i18n";
import { hydrateAppLocale } from "../src/utils/i18nLocale";
import { initCrashMonitoring } from "../src/utils/crashMonitoring";

void hydrateAppLocale();
initCrashMonitoring();

import { Stack } from "expo-router";
import { AppProviders } from "../src/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(shell)" />
      </Stack>
    </AppProviders>
  );
}

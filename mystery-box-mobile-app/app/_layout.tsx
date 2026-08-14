import "../src/i18n";
import { hydrateAppLocale } from "../src/utils/i18nLocale";
import { initCrashMonitoring } from "../src/utils/crashMonitoring";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
} from "@expo-google-fonts/be-vietnam-pro";
import { AppLoadingSplash } from "../src/components/ui/AppLoadingSplash";
import { AppProviders } from "../src/providers/AppProviders";
import { colors } from "../src/styles/tokens";

void hydrateAppLocale();
initCrashMonitoring();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <AppProviders>
        <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
          <AppLoadingSplash />
        </View>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(shell)" />
      </Stack>
    </AppProviders>
  );
}

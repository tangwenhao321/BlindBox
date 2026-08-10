import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Slot } from "expo-router";
import { AppChrome } from "../components/ui/AppChrome";
import { AppSafeRoot } from "../components/ui/AppSafeRoot";
import { AppLoadingSplash } from "../components/ui/AppLoadingSplash";
import { QueryAwareErrorBoundary } from "../components/QueryAwareErrorBoundary";
import { ToastHost } from "../components/ui/ToastHost";
import { OnboardingFlow } from "../components/OnboardingFlow";
import { AppUpdateProvider } from "../context/AppUpdateContext";
import { OnboardingAnchorProvider } from "../context/OnboardingAnchorContext";
import { AppShellProvider } from "../context/AppShellContext";
import { MainTabsProvider } from "../context/MainTabsContext";
import { AuthenticatedShell } from "../shell/AuthenticatedShell";
import { LoginGate } from "../shell/LoginGate";
import { useAppController } from "../hooks/useAppController";
import type { AppControllerLoadedViewModel } from "../hooks/buildAppControllerLoadedViewModel";

const loadingStyles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageFill: { flex: 1 },
  shell: { flex: 1 },
  routeSyncLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  appLayer: { flex: 1, zIndex: 1 },
});

function LoadedExpoRouterShell({ ctrl }: { ctrl: AppControllerLoadedViewModel }) {
  const mainTabsSlices = useMemo(() => ctrl.mainTabsSlices, [ctrl.mainTabsSlices]);

  return (
    <QueryAwareErrorBoundary
      onReset={() => {
        ctrl.resetTo("home");
      }}
    >
      <SafeAreaProvider>
        <AppChrome />
        <AppSafeRoot>
          <MainTabsProvider slices={mainTabsSlices}>
            <AppUpdateProvider>
            <OnboardingAnchorProvider>
              <SafeAreaView style={loadingStyles.pageFill} edges={["top", "left", "right"]}>
                <View style={loadingStyles.shell}>
                  <View pointerEvents="none" style={loadingStyles.routeSyncLayer}>
                    <Slot />
                  </View>
                  <View style={loadingStyles.appLayer}>
                    <AppShellProvider
                      resetTo={ctrl.resetTo}
                      showOnboarding={ctrl.showOnboarding}
                      dismissOnboarding={ctrl.dismissOnboarding}
                      modalsProps={ctrl.modalsProps}
                      loginGateProps={ctrl.loginGateProps}
                    >
                      <ToastHost elevated={ctrl.loginGateProps.visible} />
                      <AuthenticatedShell
                        onboarding={
                          <OnboardingFlow mode="intro" visible={ctrl.showOnboarding} onDone={ctrl.dismissOnboarding} />
                        }
                      />
                      <LoginGate {...ctrl.loginGateProps} />
                    </AppShellProvider>
                  </View>
                </View>
              </SafeAreaView>
            </OnboardingAnchorProvider>
            </AppUpdateProvider>
          </MainTabsProvider>
        </AppSafeRoot>
      </SafeAreaProvider>
    </QueryAwareErrorBoundary>
  );
}

/** Authenticated app shell used when expo-router is enabled. */
export function ExpoRouterShell() {
  const ctrl = useAppController();

  if (ctrl.loading) {
    return (
      <SafeAreaProvider>
        <AppChrome />
        <AppSafeRoot style={loadingStyles.center}>
          <SafeAreaView style={loadingStyles.pageFill} edges={["top", "left", "right"]}>
            <AppLoadingSplash />
          </SafeAreaView>
        </AppSafeRoot>
      </SafeAreaProvider>
    );
  }

  return <LoadedExpoRouterShell ctrl={ctrl as AppControllerLoadedViewModel} />;
}

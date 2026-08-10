import { useEffect, useState } from "react";
import {
  clearSnapshotCache,
  clearThemedAssets,
} from "../effects/revealCacheRegistry";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { isRunningInExpoGo } from "expo";
import { fetchSpendLimit, updateSpendLimitPreference, type SpendLimitView } from "../services/complianceService";
import { fetchNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from "../services/notificationPrefsService";
import { useAppUpdateContext } from "../context/AppUpdateContext";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { setAppLocale, resolveAppLocale, type AppLocale } from "../utils/i18nLocale";
import {
  getRevealAnimationsEnabled,
  getRevealFeedTickerEnabled,
  getRevealImmersiveReplay,
  getRevealReplayMode,
  getRevealReplayPreference,
  getRevealRecordingSafeMode,
  setRevealRecordingSafeMode,
  getRevealSoundEnabled,
  getRevealSoundPack,
  getRevealSoundLayerEnabled,
  getRevealTextOnlyMode,
  getRevealDanmakuEnabled,
  getRevealA11yGesturesEnabled,
  getRevealCeremonyTemplateId,
  getRevealEffectPresetId,
  getRevealFocusModeEnabled,
  getRevealPlayerFit,
  getRevealVoiceLineEnabled,
  setRevealAnimationsEnabled,
  setRevealFeedTickerEnabled,
  setRevealImmersiveReplay,
  setRevealReplayMode,
  setRevealReplayPreference,
  setRevealSoundEnabled,
  setRuntimeRevealSoundEnabled,
  setRevealSoundPack,
  setRevealSoundLayerEnabled,
  setRuntimeRevealSoundLayer,
  setRevealTextOnlyMode,
  setRevealDanmakuEnabled,
  setRevealA11yGesturesEnabled,
  setRevealCeremonyTemplateId,
  setRevealEffectPresetId,
  setRevealFocusModeEnabled,
  setRevealPlayerFit,
  setRevealVoiceLineEnabled,
  setRuntimeRevealCeremonyTemplateId,
  setRuntimeRevealEffectPresetId,
  getRevealHapticEnabled,
  getRevealParticlesEnabled,
  getRevealRhythmPreset,
  getRevealShakeEnabled,
  getRevealFlashEnabled,
  setRevealHapticEnabled,
  setRevealParticlesEnabled,
  setRevealRhythmPreset,
  setRevealShakeEnabled,
  setRevealFlashEnabled,
  setRuntimeRevealRhythmPreset,
  setRuntimeRevealParticlesEnabled,
  setRuntimeRevealShakeEnabled,
  setRuntimeRevealFlashEnabled,
  setRuntimeRevealHapticEnabled,
  type RevealEffectPresetId,
  type RevealCeremonyTemplateId,
  type RevealRhythmPreset,
  type RevealReplayMode,
  type RevealReplayPreference,
  type RevealSoundPack,
} from "../utils/revealSettings";
import {
  getActiveEmotionProfileId,
  loadEmotionProfiles,
  resolveActiveEmotionProfile,
  setActiveEmotionProfileId,
  updateActiveEmotionScalars,
} from "../effects/revealEmotionProfiles";
import { refreshRevealRecordingSafeMode } from "../effects/revealRecordingMode";
import { setRevealFocusMode } from "../effects/revealFocusMode";
import {
  loadAtmosphereProfile,
  saveAtmosphereProfile,
  type AtmosphereProfile,
} from "../effects/revealAtmosphereWorkshop";
import { setRuntimeRevealSoundPack } from "../effects/sound";
import { useAuthToken } from "../hooks/useAuthToken";
import { SubPageHeader } from "./ui/SubPageHeader";
import { PrimaryButton } from "./ui/PrimaryButton";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useScreenStyles } from "../styles/screenStyles";
import { spacing, typography, radius } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  getPaymentMethodHint,
  getPaymentMethodLabel,
  getPaymentMode,
  getWechatSdkAvailable,
  getProductionPaymentChecklistLines,
} from "../config/payment";
import { getProductionEnvWarnings } from "../utils/productionEnvCheck";
import { formatCurrency, formatCurrencyOptional } from "../utils/formatCurrency";
import { getCrashMonitoringStatus, getCrashMonitoringStatusLabel } from "../utils/crashMonitoring";
import { clearOfflineMutationQueue } from "../offline/offlineMutationQueue";
import { useAppTheme } from "../context/ThemeContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { confirmLogout } from "../utils/confirmLogout";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import {
  flushOfflineMutationQueue,
  removeOfflineMutation,
  retryOfflineMutationById,
  subscribeOfflineMutationQueue,
  type OfflineQueueSnapshot,
} from "../offline/offlineMutationQueue";
import { resolveOfflineActionLabel } from "../utils/offlineActionLabel";
import {
  getBiometricUnlockEnabled,
  isBiometricUnlockAvailable,
  setBiometricUnlockEnabled,
} from "../utils/biometricUnlock";

type Props = {
  mockPaymentEnabled: boolean;
  apiBaseUrl: string;
  remoteConfigError?: string | null;
  onRetryRemoteConfig?: () => void;
  onBack: () => void;
  onOpenPrivacy: () => void;
  onLogout?: () => void | Promise<void>;
};

export function SettingsView({
  mockPaymentEnabled,
  apiBaseUrl,
  remoteConfigError,
  onRetryRemoteConfig,
  onBack,
  onOpenPrivacy,
  onLogout,
}: Props) {
  const authToken = useAuthToken();
  const { t, i18n } = useTranslation();
  const appUpdate = useAppUpdateContext();
  const { mode: themeMode, setMode: setThemeMode } = useAppTheme();
  const screenStyles = useScreenStyles();
  const styles = useThemedStyles(buildSettingsStyles);
  const { confirm } = useConfirmDialog();
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueSnapshot>({ count: 0, labels: [], items: [] });
  const [biometricUnlock, setBiometricUnlock] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [revealAnimations, setRevealAnimations] = useState(true);
  const [revealTextOnly, setRevealTextOnly] = useState(false);
  const [revealSound, setRevealSound] = useState(true);
  const [feedTicker, setFeedTicker] = useState(true);
  const [replayPref, setReplayPref] = useState<RevealReplayPreference>("all");
  const [replayMode, setReplayMode] = useState<RevealReplayMode>("once");
  const [immersiveReplay, setImmersiveReplay] = useState(false);
  const [soundPack, setSoundPack] = useState<RevealSoundPack>("classic");
  const [rhythmPreset, setRhythmPreset] = useState<RevealRhythmPreset>("standard");
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundAmbient, setSoundAmbient] = useState(true);
  const [soundCharge, setSoundCharge] = useState(true);
  const [soundReveal, setSoundReveal] = useState(true);
  const [soundFinale, setSoundFinale] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(false);
  const [a11yGesturesEnabled, setA11yGesturesEnabled] = useState(false);
  const [playerFitOriginal, setPlayerFitOriginal] = useState(false);
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [immersiveCeremony, setImmersiveCeremony] = useState(false);
  const [effectPresetId, setEffectPresetId] = useState<RevealEffectPresetId>("default");
  const [voiceLineEnabled, setVoiceLineEnabled] = useState(false);
  const [eyeCareMode, setEyeCareMode] = useState(false);
  const [recordingSafeMode, setRecordingSafeMode] = useState(false);
  const [emotionProfileId, setEmotionProfileId] = useState("stim");
  const [emotionCharge, setEmotionCharge] = useState(1.15);
  const [emotionGap, setEmotionGap] = useState(0.9);
  const [emotionHaptic, setEmotionHaptic] = useState(1.2);
  const [emotionVolume, setEmotionVolume] = useState(1.1);
  const [emotionParticles, setEmotionParticles] = useState(1.2);
  const [atmosphereProfile, setAtmosphereProfile] = useState<AtmosphereProfile | null>(null);
  const [spendLimit, setSpendLimit] = useState<SpendLimitView | null>(null);
  const [spendLimitError, setSpendLimitError] = useState<string | null>(null);
  const [dailyCapDraft, setDailyCapDraft] = useState("");
  const [monthlyCapDraft, setMonthlyCapDraft] = useState("");
  const [savingSpendLimit, setSavingSpendLimit] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs | null>(null);
  const [notificationPrefsError, setNotificationPrefsError] = useState<string | null>(null);
  const [savingNotificationPref, setSavingNotificationPref] = useState(false);

  useEffect(() => {
    void getBiometricUnlockEnabled().then(setBiometricUnlock);
    void isBiometricUnlockAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    return subscribeOfflineMutationQueue(setOfflineQueue);
  }, []);

  useEffect(() => {
    void getRevealAnimationsEnabled().then(setRevealAnimations);
    void getRevealTextOnlyMode().then(setRevealTextOnly);
    void getRevealSoundEnabled().then(setRevealSound);
    void getRevealFeedTickerEnabled().then((v) => setFeedTicker(v ?? true));
    void getRevealReplayPreference().then(setReplayPref);
    void getRevealReplayMode().then(setReplayMode);
    void getRevealImmersiveReplay().then(setImmersiveReplay);
    void getRevealSoundPack().then((pack) => {
      setSoundPack(pack);
      setRuntimeRevealSoundPack(pack);
    });
    void getRevealRhythmPreset().then((preset) => {
      setRhythmPreset(preset);
      setRuntimeRevealRhythmPreset(preset);
    });
    void getRevealParticlesEnabled().then(setParticlesEnabled);
    void getRevealShakeEnabled().then(setShakeEnabled);
    void getRevealFlashEnabled().then(setFlashEnabled);
    void getRevealHapticEnabled().then(setHapticEnabled);
    void getRevealSoundLayerEnabled("ambient").then(setSoundAmbient);
    void getRevealSoundLayerEnabled("charge").then(setSoundCharge);
    void getRevealSoundLayerEnabled("reveal").then(setSoundReveal);
    void getRevealSoundLayerEnabled("finale").then(setSoundFinale);
    void getRevealDanmakuEnabled().then(setDanmakuEnabled);
    void getRevealA11yGesturesEnabled().then(setA11yGesturesEnabled);
    void getRevealPlayerFit().then((fit) => setPlayerFitOriginal(fit === "original"));
    void getRevealFocusModeEnabled().then((v) => {
      setFocusModeEnabled(v);
      setRevealFocusMode(v);
    });
    void getRevealCeremonyTemplateId().then((id) => {
      setImmersiveCeremony(id === "immersive");
      setRuntimeRevealCeremonyTemplateId(id);
    });
    void getRevealEffectPresetId().then((id) => {
      setEffectPresetId(id);
      setRuntimeRevealEffectPresetId(id);
    });
    void getRevealVoiceLineEnabled().then(setVoiceLineEnabled);
    void getRevealRecordingSafeMode().then(setRecordingSafeMode);
    void loadEmotionProfiles().then(() => {
      setEmotionProfileId(getActiveEmotionProfileId());
      const p = resolveActiveEmotionProfile();
      setEmotionCharge(p.chargeScale);
      setEmotionGap(p.gapScale);
      setEmotionHaptic(p.hapticScale);
      setEmotionVolume(p.volumeScale);
      setEmotionParticles(p.particleScale);
    });
    void loadAtmosphereProfile().then(setAtmosphereProfile);
  }, []);

  useEffect(() => {
    if (!authToken) {
      setSpendLimit(null);
      setSpendLimitError(null);
      return;
    }
    void fetchSpendLimit(authToken)
      .then((view) => {
        setSpendLimit(view);
        setDailyCapDraft(view.userDailyLimit != null ? String(view.userDailyLimit) : String(view.dailyLimit ?? ""));
        setMonthlyCapDraft(
          view.userMonthlyLimit != null ? String(view.userMonthlyLimit) : String(view.monthlyLimit ?? ""),
        );
        setSpendLimitError(null);
      })
      .catch((error) => {
        setSpendLimit(null);
        setSpendLimitError(parseError(error));
      });
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setNotificationPrefs(null);
      setNotificationPrefsError(null);
      return;
    }
    void fetchNotificationPrefs(authToken)
      .then((prefs) => {
        setNotificationPrefs(prefs);
        setNotificationPrefsError(null);
      })
      .catch((error) => {
        setNotificationPrefs(null);
        setNotificationPrefsError(parseError(error));
      });
  }, [authToken]);

  const patchNotificationPref = async (patch: Partial<NotificationPrefs>) => {
    if (!authToken || !notificationPrefs || savingNotificationPref) return;
    const next = { ...notificationPrefs, ...patch };
    setNotificationPrefs(next);
    setSavingNotificationPref(true);
    try {
      const saved = await updateNotificationPrefs(authToken, next);
      setNotificationPrefs(saved);
      setNotificationPrefsError(null);
      const changedKey = Object.keys(patch)[0];
      if (changedKey) {
        trackEvent(ANALYTICS_EVENTS.NOTIFICATION_PREF_CHANGE, {
          key: changedKey,
          value: String(next[changedKey as keyof NotificationPrefs]),
        });
      }
    } catch (error) {
      setNotificationPrefs(notificationPrefs);
      setNotificationPrefsError(parseError(error));
      toast.error(parseError(error));
    } finally {
      setSavingNotificationPref(false);
    }
  };

  const mode = getPaymentMode();
  const productionWarnings = getProductionEnvWarnings();
  const crashStatus = getCrashMonitoringStatus();
  const loopbackApi =
    /127\.0\.0\.1|localhost/i.test(apiBaseUrl) &&
    !/10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+/i.test(apiBaseUrl);
  const coolingOff = Boolean(spendLimit?.inCoolingOff);
  const locale = resolveAppLocale(i18n.language);

  const switchLocale = (next: AppLocale) => {
    void setAppLocale(next);
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("settings.title")} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.content}>
        {remoteConfigError ? (
          <ListErrorBanner
            message={t("settings.remoteConfigError", { message: remoteConfigError })}
            onRetry={onRetryRemoteConfig}
          />
        ) : null}
        <View style={screenStyles.screenCard}>
          <Text style={styles.label}>{t("settings.language")}</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langChip, locale === "zh-CN" ? styles.langChipOn : null]}
              onPress={() => switchLocale("zh-CN")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.languageZh")}
              accessibilityState={{ selected: locale === "zh-CN" }}
            >
              <Text style={[styles.langText, locale === "zh-CN" ? styles.langTextOn : null]}>{t("settings.languageZh")}</Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, locale === "en-US" ? styles.langChipOn : null]}
              onPress={() => switchLocale("en-US")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.languageEn")}
              accessibilityState={{ selected: locale === "en-US" }}
            >
              <Text style={[styles.langText, locale === "en-US" ? styles.langTextOn : null]}>{t("settings.languageEn")}</Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, locale === "vi-VN" ? styles.langChipOn : null]}
              onPress={() => switchLocale("vi-VN")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.languageVi")}
              accessibilityState={{ selected: locale === "vi-VN" }}
            >
              <Text style={[styles.langText, locale === "vi-VN" ? styles.langTextOn : null]}>{t("settings.languageVi")}</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>{t("settings.appearance")}</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langChip, themeMode === "light" ? styles.langChipOn : null]}
              onPress={() => setThemeMode("light")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.themeLight")}
              accessibilityState={{ selected: themeMode === "light" }}
            >
              <Text style={[styles.langText, themeMode === "light" ? styles.langTextOn : null]}>{t("settings.themeLight")}</Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, themeMode === "dark" ? styles.langChipOn : null]}
              onPress={() => setThemeMode("dark")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.themeDark")}
              accessibilityState={{ selected: themeMode === "dark" }}
            >
              <Text style={[styles.langText, themeMode === "dark" ? styles.langTextOn : null]}>{t("settings.themeDark")}</Text>
            </Pressable>
            <Pressable
              style={[styles.langChip, themeMode === "system" ? styles.langChipOn : null]}
              onPress={() => setThemeMode("system")}
              accessibilityRole="button"
              accessibilityLabel={t("settings.themeSystem")}
              accessibilityState={{ selected: themeMode === "system" }}
            >
              <Text style={[styles.langText, themeMode === "system" ? styles.langTextOn : null]}>{t("settings.themeSystem")}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>{t("settings.appearanceHint")}</Text>
          {authToken ? (
            <View style={styles.spendLimitBlock}>
              <Text style={[styles.label, styles.gapTop]} accessibilityRole="header">
                {t("settings.notificationTitle")}
              </Text>
              <Text style={styles.hint}>{t("settings.notificationHint")}</Text>
              {notificationPrefsError ? <Text style={styles.warn}>{notificationPrefsError}</Text> : null}
              {notificationPrefs ? (
                <>
                  {(
                    [
                      ["orderEnabled", "settings.notifyOrder"],
                      ["refundEnabled", "settings.notifyRefund"],
                      ["warehouseShipEnabled", "settings.notifyWarehouse"],
                      ["marketplaceEnabled", "settings.notifyMarketplace"],
                      ["marketingEnabled", "settings.notifyMarketing"],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <View key={key} style={styles.switchRow}>
                      <Text style={styles.label}>{t(labelKey)}</Text>
                      <Switch
                        value={notificationPrefs[key]}
                        accessibilityLabel={t(labelKey)}
                        onValueChange={(v) => void patchNotificationPref({ [key]: v })}
                      />
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.hint}>{t("settings.notificationLoading")}</Text>
              )}
            </View>
          ) : null}
          {__DEV__ ? (
            <>
              <Text style={styles.label}>{t("settings.apiEndpoint")}</Text>
              <Text style={styles.value}>{apiBaseUrl || t("settings.apiNotConfigured")}</Text>
              {isRunningInExpoGo() ? <Text style={styles.warn}>{t("settings.expoGoWarn")}</Text> : null}
              {loopbackApi ? (
                <Text style={styles.warn}>{t("settings.loopbackWarn")}</Text>
              ) : !apiBaseUrl ? (
                <Text style={styles.warn}>{t("settings.apiMissingWarn")}</Text>
              ) : null}
              <Text style={[styles.label, styles.gapTop]}>{t("settings.paymentMode")}</Text>
              <Text style={styles.value}>
                {mockPaymentEnabled || mode === "mock" ? t("settings.paymentMock") : getPaymentMethodLabel()}
              </Text>
              <Text style={styles.hint}>{getPaymentMethodHint()}</Text>
            </>
          ) : null}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.revealSound")}</Text>
              <Text style={styles.hint}>{t("settings.revealSoundHint")}</Text>
            </View>
            <Switch
              value={revealSound}
              accessibilityLabel={t("settings.revealSound")}
              accessibilityHint={t("settings.revealSoundHint")}
              onValueChange={(v) => {
                setRevealSound(v);
                setRuntimeRevealSoundEnabled(v);
                void setRevealSoundEnabled(v);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_sound", value: v });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.revealSoundAmbient", { defaultValue: "Ambient layer" })}</Text>
            </View>
            <Switch
              value={soundAmbient}
              onValueChange={(v) => {
                setSoundAmbient(v);
                setRuntimeRevealSoundLayer("ambient", v);
                void setRevealSoundLayerEnabled("ambient", v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealSoundCharge", { defaultValue: "Charge layer" })}</Text>
            </View>
            <Switch
              value={soundCharge}
              onValueChange={(v) => {
                setSoundCharge(v);
                setRuntimeRevealSoundLayer("charge", v);
                void setRevealSoundLayerEnabled("charge", v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealSoundRevealLayer", { defaultValue: "Reveal layer" })}</Text>
            </View>
            <Switch
              value={soundReveal}
              onValueChange={(v) => {
                setSoundReveal(v);
                setRuntimeRevealSoundLayer("reveal", v);
                void setRevealSoundLayerEnabled("reveal", v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealSoundFinale", { defaultValue: "Finale layer" })}</Text>
            </View>
            <Switch
              value={soundFinale}
              onValueChange={(v) => {
                setSoundFinale(v);
                setRuntimeRevealSoundLayer("finale", v);
                void setRevealSoundLayerEnabled("finale", v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealDanmaku", { defaultValue: "Replay danmaku" })}</Text>
            </View>
            <Switch
              value={danmakuEnabled}
              onValueChange={(v) => {
                setDanmakuEnabled(v);
                void setRevealDanmakuEnabled(v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealA11yGestures", { defaultValue: "Accessibility reveal gestures" })}</Text>
            </View>
            <Switch
              value={a11yGesturesEnabled}
              onValueChange={(v) => {
                setA11yGesturesEnabled(v);
                void setRevealA11yGesturesEnabled(v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealFocusMode", { defaultValue: "Reveal focus mode" })}</Text>
            </View>
            <Switch
              value={focusModeEnabled}
              onValueChange={(v) => {
                setFocusModeEnabled(v);
                setRevealFocusMode(v);
                void setRevealFocusModeEnabled(v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealImmersiveCeremony", { defaultValue: "Immersive ceremony" })}</Text>
            </View>
            <Switch
              value={immersiveCeremony}
              onValueChange={(v) => {
                setImmersiveCeremony(v);
                const id: RevealCeremonyTemplateId = v ? "immersive" : "efficiency";
                setRuntimeRevealCeremonyTemplateId(id);
                void setRevealCeremonyTemplateId(id);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEyeCare", { defaultValue: "Eye-care ceremony" })}</Text>
            </View>
            <Switch
              value={eyeCareMode}
              onValueChange={(v) => {
                setEyeCareMode(v);
                const id: RevealCeremonyTemplateId = v ? "eyeCare" : "standard";
                setRuntimeRevealCeremonyTemplateId(id);
                void setRevealCeremonyTemplateId(id);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealRecordingSafe", { defaultValue: "Recording-safe mode" })}</Text>
            </View>
            <Switch
              value={recordingSafeMode}
              onValueChange={(v) => {
                setRecordingSafeMode(v);
                void setRevealRecordingSafeMode(v).then(() => refreshRevealRecordingSafeMode());
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionProfile", { defaultValue: "Emotion rhythm profile" })}</Text>
              <Text style={styles.hint}>{emotionProfileId}</Text>
            </View>
            <Switch
              value={emotionProfileId === "chill"}
              onValueChange={(v) => {
                const id = v ? "chill" : "stim";
                setEmotionProfileId(id);
                setActiveEmotionProfileId(id);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionCharge", { defaultValue: "Charge intensity" })}</Text>
              <Text style={styles.hint}>{emotionCharge.toFixed(2)}</Text>
            </View>
            <Switch
              value={emotionCharge > 1}
              onValueChange={(v) => {
                const next = v ? 1.15 : 0.9;
                setEmotionCharge(next);
                updateActiveEmotionScalars({ chargeScale: next });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionVolume", { defaultValue: "Sound volume" })}</Text>
              <Text style={styles.hint}>{emotionVolume.toFixed(2)}</Text>
            </View>
            <Switch
              value={emotionVolume > 0.85}
              onValueChange={(v) => {
                const next = v ? 1.1 : 0.65;
                setEmotionVolume(next);
                updateActiveEmotionScalars({ volumeScale: next });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionGap", { defaultValue: "Anticipation gap" })}</Text>
              <Text style={styles.hint}>{emotionGap.toFixed(2)}</Text>
            </View>
            <Switch
              value={emotionGap < 1}
              onValueChange={(v) => {
                const next = v ? 0.9 : 1.15;
                setEmotionGap(next);
                updateActiveEmotionScalars({ gapScale: next });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionHaptic", { defaultValue: "Haptic intensity" })}</Text>
              <Text style={styles.hint}>{emotionHaptic.toFixed(2)}</Text>
            </View>
            <Switch
              value={emotionHaptic > 0.85}
              onValueChange={(v) => {
                const next = v ? 1.2 : 0.35;
                setEmotionHaptic(next);
                updateActiveEmotionScalars({ hapticScale: next });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEmotionParticles", { defaultValue: "Particle density" })}</Text>
              <Text style={styles.hint}>{emotionParticles.toFixed(2)}</Text>
            </View>
            <Switch
              value={emotionParticles > 0.85}
              onValueChange={(v) => {
                const next = v ? 1.2 : 0.55;
                setEmotionParticles(next);
                updateActiveEmotionScalars({ particleScale: next });
              }}
            />
          </View>
          <Text style={[styles.label, styles.gapTop]}>
            {t("settings.revealAtmosphereWorkshop", { defaultValue: "Atmosphere workshop" })}
          </Text>
          <Text style={styles.hint}>
            {t("settings.revealAtmosphereWorkshopHint", {
              defaultValue: "Tune ceremony mood, sound pack, and particle style for the next reveal.",
            })}
          </Text>
          {(["soundPack", "particleStyle", "lightStyle"] as const).map((field) => (
            <View key={field} style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.label}>
                  {t(`settings.revealAtmosphere_${field}`, { defaultValue: field })}
                </Text>
              </View>
              <View style={styles.langRow}>
                {(field === "soundPack"
                  ? (["standard", "soft", "arcade"] as const)
                  : field === "particleStyle"
                    ? (["sparkle", "dust", "ribbon"] as const)
                    : (["warm", "cool", "neutral"] as const)
                ).map((option) => {
                  const active = atmosphereProfile?.[field] === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => {
                        void saveAtmosphereProfile({ [field]: option }).then((next) => {
                          setAtmosphereProfile(next);
                          if (field === "soundPack") {
                            const pack =
                              option === "arcade"
                                ? "neon"
                                : option === "soft"
                                  ? "minimal"
                                  : "classic";
                            setSoundPack(pack);
                            setRuntimeRevealSoundPack(pack);
                            void setRevealSoundPack(pack);
                          }
                          toast.success(
                            t("settings.revealAtmosphereSaved", { defaultValue: "Atmosphere updated" }),
                          );
                        });
                      }}
                      style={[styles.langChip, active ? styles.langChipOn : null]}
                    >
                      <Text style={[styles.langText, active ? styles.langTextOn : null]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealCacheSnapshots", { defaultValue: "Clear highlight snapshots" })}</Text>
              <Text style={styles.hint}>{t("settings.revealCacheSnapshotsHint", { defaultValue: "7-day temporary cache" })}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void clearSnapshotCache().then(() =>
                  toast.success(t("settings.revealCacheCleared", { defaultValue: "Cache cleared" })),
                );
              }}
            >
              <Text style={styles.linkAction}>{t("common.clear", { defaultValue: "Clear" })}</Text>
            </Pressable>
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealCacheThemed", { defaultValue: "Clear event theme cache" })}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void clearThemedAssets().then(() =>
                  toast.success(t("settings.revealCacheCleared", { defaultValue: "Cache cleared" })),
                );
              }}
            >
              <Text style={styles.linkAction}>{t("common.clear", { defaultValue: "Clear" })}</Text>
            </Pressable>
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealVoiceLine", { defaultValue: "Brand voice lines" })}</Text>
            </View>
            <Switch
              value={voiceLineEnabled}
              onValueChange={(v) => {
                setVoiceLineEnabled(v);
                void setRevealVoiceLineEnabled(v);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealEffectPreset", { defaultValue: "Effect preset (neon)" })}</Text>
            </View>
            <Switch
              value={effectPresetId === "neon"}
              onValueChange={(v) => {
                const id: RevealEffectPresetId = v ? "neon" : "default";
                setEffectPresetId(id);
                setRuntimeRevealEffectPresetId(id);
                void setRevealEffectPresetId(id);
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealPlayerOriginal", { defaultValue: "Original quality replay" })}</Text>
            </View>
            <Switch
              value={playerFitOriginal}
              onValueChange={(v) => {
                setPlayerFitOriginal(v);
                void setRevealPlayerFit(v ? "original" : "fitScreen");
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.revealAnimations")}</Text>
              <Text style={styles.hint}>{t("settings.revealAnimationsHint")}</Text>
            </View>
            <Switch
              value={revealAnimations}
              accessibilityLabel={t("settings.revealAnimations")}
              accessibilityHint={t("settings.revealAnimationsHint")}
              onValueChange={(v) => {
                setRevealAnimations(v);
                void setRevealAnimationsEnabled(v);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_animations", value: v });
                if (v && revealTextOnly) {
                  setRevealTextOnly(false);
                  void setRevealTextOnlyMode(false);
                }
              }}
            />
          </View>
          <Text style={[styles.label, styles.gapTop]} accessibilityRole="header">
            {t("settings.revealPrefsTitle")}
          </Text>
          <Text style={styles.hint}>{t("settings.revealPrefsHint")}</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealFeedTicker")}</Text>
              <Text style={styles.hint}>{t("settings.revealFeedTickerHint")}</Text>
            </View>
            <Switch
              value={feedTicker}
              accessibilityLabel={t("settings.revealFeedTicker")}
              onValueChange={(v) => {
                setFeedTicker(v);
                void setRevealFeedTickerEnabled(v);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_feed_ticker", value: v });
              }}
            />
          </View>
          <Text style={[styles.label, styles.gapTop]}>{t("settings.revealReplayPref")}</Text>
          <View style={styles.langRow}>
            {(["all", "finale", "highlights"] as const).map((key) => (
              <Pressable
                key={key}
                style={[styles.langChip, replayPref === key ? styles.langChipOn : null]}
                onPress={() => {
                  setReplayPref(key);
                  void setRevealReplayPreference(key);
                  trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_replay_pref", value: key });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: replayPref === key }}
              >
                <Text style={[styles.langText, replayPref === key ? styles.langTextOn : null]}>
                  {t(`settings.revealReplayPref_${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealReplayLoop")}</Text>
              <Text style={styles.hint}>{t("settings.revealReplayLoopHint")}</Text>
            </View>
            <Switch
              value={replayMode === "loop"}
              accessibilityLabel={t("settings.revealReplayLoop")}
              onValueChange={(v) => {
                const mode: RevealReplayMode = v ? "loop" : "once";
                setReplayMode(mode);
                void setRevealReplayMode(mode);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_replay_loop", value: v });
              }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.label}>{t("settings.revealImmersive")}</Text>
              <Text style={styles.hint}>{t("settings.revealImmersiveHint")}</Text>
            </View>
            <Switch
              value={immersiveReplay}
              accessibilityLabel={t("settings.revealImmersive")}
              onValueChange={(v) => {
                setImmersiveReplay(v);
                void setRevealImmersiveReplay(v);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_immersive", value: v });
              }}
            />
          </View>
          <Text style={[styles.label, styles.gapTop]}>{t("settings.revealSoundPack")}</Text>
          <View style={styles.langRow}>
            {(["classic", "cute", "neon", "minimal"] as const).map((key) => (
              <Pressable
                key={key}
                style={[styles.langChip, soundPack === key ? styles.langChipOn : null]}
                onPress={() => {
                  setSoundPack(key);
                  setRuntimeRevealSoundPack(key);
                  void setRevealSoundPack(key);
                  trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_sound_pack", value: key });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: soundPack === key }}
              >
                <Text style={[styles.langText, soundPack === key ? styles.langTextOn : null]}>
                  {t(`settings.revealSoundPack_${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, styles.gapTop]}>{t("settings.revealRhythmPreset")}</Text>
          <Text style={styles.hint}>{t("settings.revealRhythmPresetHint")}</Text>
          <View style={styles.langRow}>
            {(["immersive", "standard", "rapid"] as const).map((key) => (
              <Pressable
                key={key}
                style={[styles.langChip, rhythmPreset === key ? styles.langChipOn : null]}
                onPress={() => {
                  setRhythmPreset(key);
                  setRuntimeRevealRhythmPreset(key);
                  void setRevealRhythmPreset(key);
                  trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_rhythm", value: key });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: rhythmPreset === key }}
              >
                <Text style={[styles.langText, rhythmPreset === key ? styles.langTextOn : null]}>
                  {t(`settings.revealRhythmPreset_${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {(
            [
              ["particles", particlesEnabled, setParticlesEnabled, setRevealParticlesEnabled, "settings.revealParticles"],
              ["shake", shakeEnabled, setShakeEnabled, setRevealShakeEnabled, "settings.revealShake"],
              ["flash", flashEnabled, setFlashEnabled, setRevealFlashEnabled, "settings.revealFlash"],
              ["haptic", hapticEnabled, setHapticEnabled, setRevealHapticEnabled, "settings.revealHaptic"],
            ] as const
          ).map(([key, value, setter, persist, labelKey]) => (
            <View key={key} style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.label}>{t(labelKey)}</Text>
              </View>
              <Switch
                value={value}
                accessibilityLabel={t(labelKey)}
                onValueChange={(v) => {
                  setter(v);
                  void persist(v);
                  if (key === "particles") setRuntimeRevealParticlesEnabled(v);
                  if (key === "shake") setRuntimeRevealShakeEnabled(v);
                  if (key === "flash") setRuntimeRevealFlashEnabled(v);
                  if (key === "haptic") setRuntimeRevealHapticEnabled(v);
                  trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: `reveal_${key}`, value: v });
                }}
              />
            </View>
          ))}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.revealTextOnly")}</Text>
              <Text style={styles.hint}>{t("settings.revealTextOnlyHint")}</Text>
            </View>
            <Switch
              value={revealTextOnly}
              accessibilityLabel={t("settings.revealTextOnly")}
              accessibilityHint={t("settings.revealTextOnlyHint")}
              onValueChange={(v) => {
                setRevealTextOnly(v);
                void setRevealTextOnlyMode(v);
                trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "reveal_text_only", value: v });
                if (v && revealAnimations) {
                  setRevealAnimations(false);
                  void setRevealAnimationsEnabled(false);
                }
              }}
            />
          </View>
          {__DEV__ && mode === "mock" ? (
            <View style={styles.checklist}>
              <Text style={styles.label}>{t("settings.prodChecklistTitle")}</Text>
              {getProductionPaymentChecklistLines().map((line) => (
                <Text key={line} style={styles.checkItem}>
                  · {line}
                </Text>
              ))}
            </View>
          ) : null}
          {__DEV__ && productionWarnings.length ? (
            <View style={styles.checklist}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.prodWarningsTitle")}</Text>
              {productionWarnings.map((line) => (
                <Text key={line} style={styles.warnItem}>
                  · {line}
                </Text>
              ))}
            </View>
          ) : null}
          {__DEV__ ? (
            <>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.crashMonitoring")}</Text>
              <Text style={styles.value}>{getCrashMonitoringStatusLabel(crashStatus)}</Text>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.wechatSdk")}</Text>
              <Text style={styles.value}>
                {getWechatSdkAvailable() ? t("settings.wechatSdkInstalled") : t("settings.wechatSdkMissing")}
              </Text>
              {crashStatus === "dsn_missing_sdk" ? <Text style={styles.hint}>{t("settings.sentryHint")}</Text> : null}
              <PrimaryButton
                label={t("settings.clearOfflineQueue")}
                variant="ghost"
                onPress={() => {
                  clearOfflineMutationQueue();
                  toast.info(t("settings.clearOfflineQueueDone"));
                }}
              />
            </>
          ) : null}
          {biometricAvailable ? (
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={[styles.label, styles.gapTop]}>{t("settings.biometricUnlock")}</Text>
                <Text style={styles.hint}>{t("settings.biometricUnlockHint")}</Text>
              </View>
              <Switch
                value={biometricUnlock}
                accessibilityLabel={t("settings.biometricUnlock")}
                onValueChange={(v) => {
                  setBiometricUnlock(v);
                  void setBiometricUnlockEnabled(v);
                  trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE, { key: "biometric_unlock", value: v });
                }}
              />
            </View>
          ) : null}
          {authToken ? (
            <View style={styles.spendLimitBlock}>
              <Text style={[styles.label, styles.gapTop]} accessibilityRole="header">
                {t("settings.offlineQueueTitle")}
              </Text>
              <Text style={styles.hint}>
                {offlineQueue.count > 0
                  ? t("settings.offlineQueueHint", { count: offlineQueue.count })
                  : t("settings.offlineQueueIdle")}
              </Text>
              {offlineQueue.count > 0 ? (
                <View style={styles.offlineQueueList}>
                  <Text style={styles.label}>{t("settings.offlineQueueItems")}</Text>
                  {offlineQueue.items.map((item) => (
                    <View key={item.id} style={styles.offlineQueueRow}>
                      <Text style={styles.hint} numberOfLines={2}>
                        · {resolveOfflineActionLabel(item.label)}
                      </Text>
                      <View style={styles.offlineQueueActions}>
                        <Pressable
                          onPress={() => {
                            void retryOfflineMutationById(item.id).then((ok) => {
                              toast.info(ok ? t("settings.offlineQueueItemRetryDone") : t("settings.offlineQueueItemRetryFailed"));
                            });
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t("settings.offlineQueueItemRetry")}
                        >
                          <Text style={styles.offlineQueueAction}>{t("settings.offlineQueueItemRetry")}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            removeOfflineMutation(item.id);
                            toast.info(t("settings.offlineQueueItemRemoved"));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t("settings.offlineQueueItemDelete")}
                        >
                          <Text style={styles.offlineQueueActionDanger}>{t("settings.offlineQueueItemDelete")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {offlineQueue.count > 0 ? (
                <PrimaryButton
                  label={t("settings.offlineQueueRetry")}
                  variant="ghost"
                  onPress={() => {
                    void flushOfflineMutationQueue().then(() => toast.info(t("settings.offlineQueueRetryDone")));
                  }}
                />
              ) : null}
            </View>
          ) : null}
          {authToken ? (
            <View style={styles.spendLimitBlock} accessibilityRole="summary">
              <Text style={[styles.label, styles.gapTop]} accessibilityRole="header">
                {t("settings.spendLimitTitle")}
              </Text>
              {spendLimitError ? (
                <Text style={styles.warn}>{spendLimitError}</Text>
              ) : spendLimit?.enabled ? (
                <>
                  <Text style={styles.value}>
                    {t("settings.spendLimitDaily", {
                      spent: formatCurrency(spendLimit.dailySpent ?? 0),
                      limit: formatCurrencyOptional(spendLimit.dailyLimit ?? null),
                      remaining: formatCurrencyOptional(spendLimit.dailyRemaining ?? null),
                    })}
                  </Text>
                  <Text style={styles.hint}>
                    {t("settings.spendLimitMonthly", {
                      spent: formatCurrency(spendLimit.monthlySpent ?? 0),
                      limit: formatCurrencyOptional(spendLimit.monthlyLimit ?? null),
                      remaining: formatCurrencyOptional(spendLimit.monthlyRemaining ?? null),
                    })}
                  </Text>
                  {spendLimit.serverDailyLimit != null || spendLimit.serverMonthlyLimit != null ? (
                    <Text style={styles.hint}>
                      {t("settings.spendLimitServerCap", {
                        daily: formatCurrencyOptional(spendLimit.serverDailyLimit ?? null),
                        monthly: formatCurrencyOptional(spendLimit.serverMonthlyLimit ?? null),
                      })}
                    </Text>
                  ) : null}
                  {!spendLimit.withinLimits ? (
                    <Text style={styles.warn}>{t("settings.spendLimitExceeded")}</Text>
                  ) : null}
                  {coolingOff && spendLimit.coolingOffUntil ? (
                    <Text style={styles.warn}>{t("settings.spendLimitCoolingOff", { until: spendLimit.coolingOffUntil })}</Text>
                  ) : null}
                  <Text style={[styles.label, styles.gapTop]}>{t("settings.spendLimitUserDaily")}</Text>
                  <TextInput
                    style={[styles.input, coolingOff ? styles.inputDisabled : null]}
                    keyboardType="decimal-pad"
                    editable={!coolingOff}
                    value={dailyCapDraft}
                    onChangeText={setDailyCapDraft}
                    accessibilityLabel={t("settings.spendLimitUserDaily")}
                  />
                  <Text style={[styles.label, styles.gapTop]}>{t("settings.spendLimitUserMonthly")}</Text>
                  <TextInput
                    style={[styles.input, coolingOff ? styles.inputDisabled : null]}
                    keyboardType="decimal-pad"
                    editable={!coolingOff}
                    value={monthlyCapDraft}
                    onChangeText={setMonthlyCapDraft}
                    accessibilityLabel={t("settings.spendLimitUserMonthly")}
                  />
                  <PrimaryButton
                    label={t("settings.spendLimitSave")}
                    loading={savingSpendLimit}
                    disabled={coolingOff}
                    onPress={() => {
                      if (!authToken || coolingOff) return;
                      setSavingSpendLimit(true);
                      void updateSpendLimitPreference(authToken, {
                        dailyLimit: Number(dailyCapDraft),
                        monthlyLimit: Number(monthlyCapDraft),
                      })
                        .then((view) => {
                          setSpendLimit(view);
                          toast.success(t("settings.spendLimitSaved"));
                        })
                        .catch((error) => toast.error(parseError(error)))
                        .finally(() => setSavingSpendLimit(false));
                    }}
                  />
                </>
              ) : (
                <Text style={styles.hint}>{t("settings.spendLimitDisabled")}</Text>
              )}
            </View>
          ) : null}
          {productionWarnings.length && !__DEV__ ? (
            <View style={styles.checklist}>
              <Text style={[styles.label, styles.gapTop]}>{t("settings.prodWarningsTitle")}</Text>
              {productionWarnings.map((line) => (
                <Text key={line} style={styles.warnItem}>
                  · {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        {appUpdate.supported ? (
          <View style={styles.checklist}>
            <Text style={[styles.label, styles.gapTop]}>{t("appUpdate.currentVersion", { version: appUpdate.localVersion.versionName })}</Text>
            <PrimaryButton
              label={t("appUpdate.checkUpdate")}
              loading={appUpdate.phase === "checking"}
              onPress={() => void appUpdate.checkForUpdate({ manual: true })}
            />
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [screenStyles.secondaryBtn, pressed ? screenStyles.pressed : null]}
          onPress={onOpenPrivacy}
          accessibilityRole="button"
          accessibilityLabel={t("settings.privacyPolicy")}
        >
          <Text style={screenStyles.secondaryText}>{t("settings.privacyPolicy")}</Text>
        </Pressable>
        {authToken && onLogout ? (
          <PrimaryButton
            label={t("settings.logout")}
            variant="ghost"
            onPress={() => void confirmLogout(confirm, onLogout, t)}
          />
        ) : null}
      </ScreenScaffold>
    </View>
  );
}

function buildSettingsStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPage },
  content: { gap: spacing.md },
  label: { fontSize: typography.caption, color: colors.textMuted, fontWeight: "700" },
  value: { marginTop: spacing.xs, fontSize: typography.body, color: colors.textPrimary, lineHeight: 22 },
  gapTop: { marginTop: spacing.md },
  hint: { marginTop: spacing.sm, fontSize: typography.caption, color: colors.textSecondary, lineHeight: 20 },
  warn: { marginTop: spacing.sm, fontSize: typography.caption, color: colors.warning, lineHeight: 20 },
  checklist: { marginTop: spacing.md, gap: spacing.xs },
  checkItem: { fontSize: typography.caption, color: colors.textMuted, lineHeight: 18 },
  warnItem: { fontSize: typography.caption, color: colors.warning, lineHeight: 18 },
  switchRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  switchTextCol: { flex: 1 },
  linkAction: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  spendLimitBlock: { marginTop: spacing.sm },
  offlineQueueList: { marginTop: spacing.xs, gap: spacing.sm },
  offlineQueueRow: { gap: spacing.xs },
  offlineQueueActions: { flexDirection: "row", gap: spacing.md, marginLeft: spacing.sm },
  offlineQueueAction: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  offlineQueueActionDanger: { color: colors.danger, fontWeight: "700", fontSize: typography.caption },
  langRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipOn: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
  langText: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "700" },
  langTextOn: { color: colors.brand },
  input: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  inputDisabled: { opacity: 0.5, backgroundColor: colors.bgSoft },
  });
}

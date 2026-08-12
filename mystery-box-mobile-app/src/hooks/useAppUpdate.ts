import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform, type AppStateStatus } from "react-native";
import { parseError } from "../api";
import { fetchAppUpdateInfo, type AppUpdateInfo } from "../services/appUpdateService";
import { subscribeAppUpdateRequests } from "../services/appUpdateSignal";
import { downloadApkUpdate, installDownloadedApk, type ApkDownloadProgress } from "../utils/installApkUpdate";
import { getLocalAppVersion, isNativeAppUpdateSupported, resolveIosAppStoreUrl } from "../utils/appVersion";
import i18n from "../i18n";
import { toast } from "../utils/toast";

const DISMISS_KEY = "app_update_dismissed_code";

type Phase = "idle" | "checking" | "ready" | "downloading" | "installing";

export type AppUpdateController = {
  visible: boolean;
  info: AppUpdateInfo | null;
  phase: Phase;
  progress: ApkDownloadProgress | null;
  error: string | null;
  localVersion: ReturnType<typeof getLocalAppVersion>;
  supported: boolean;
  checkForUpdate: (opts?: { manual?: boolean; silent?: boolean }) => Promise<AppUpdateInfo | null>;
  startDownload: () => Promise<void>;
  dismiss: () => void;
};

async function readDismissedVersionCode(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(DISMISS_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function rememberDismissedVersionCode(versionCode: number) {
  await AsyncStorage.setItem(DISMISS_KEY, String(versionCode));
}

export function useAppUpdateController(): AppUpdateController {
  const supported = isNativeAppUpdateSupported();
  const localVersion = useMemo(() => getLocalAppVersion(), []);
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ApkDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const lastSuccessAtRef = useRef(0);
  const MIN_AUTO_CHECK_MS = 15 * 60 * 1000;

  const checkForUpdate = useCallback(
    async (opts?: { manual?: boolean; silent?: boolean }) => {
      if (!supported) {
        if (opts?.manual) toast.info(i18n.t("appUpdate.platformUnsupported"));
        return null;
      }
      if (
        !opts?.manual &&
        lastSuccessAtRef.current > 0 &&
        Date.now() - lastCheckAtRef.current < MIN_AUTO_CHECK_MS
      ) {
        return info;
      }
      if (opts?.manual) {
        lastCheckAtRef.current = 0;
        lastSuccessAtRef.current = 0;
      }
      if (checkingRef.current) return info;
      checkingRef.current = true;
      setPhase("checking");
      setError(null);
      try {
        const next = await fetchAppUpdateInfo(localVersion.versionCode);
        lastCheckAtRef.current = Date.now();
        lastSuccessAtRef.current = Date.now();
        if (!next.hasUpdate) {
          setInfo(null);
          setVisible(false);
          setPhase("idle");
          if (opts?.manual) toast.success(i18n.t("appUpdate.alreadyLatest"));
          return null;
        }
        if (opts?.manual) {
          await AsyncStorage.removeItem(DISMISS_KEY);
        } else if (!next.forceUpdate) {
          const dismissed = await readDismissedVersionCode();
          if (dismissed != null && dismissed >= next.versionCode) {
            setPhase("idle");
            return null;
          }
        }
        setInfo(next);
        setVisible(true);
        setPhase("ready");
        if (opts?.manual && opts?.silent !== true) {
          toast.info(i18n.t("appUpdate.updateAvailable"));
        }
        return next;
      } catch (err) {
        const message = parseError(err);
        setError(message);
        setPhase("idle");
        if (opts?.manual) toast.error(message);
        return null;
      } finally {
        checkingRef.current = false;
      }
    },
    [info, localVersion.versionCode, supported],
  );

  const startDownload = useCallback(async () => {
    if (!info) return;
    setError(null);
    if (Platform.OS === "ios") {
      const storeUrl = resolveIosAppStoreUrl(info.downloadUrl);
      if (!storeUrl) {
        setError(i18n.t("appUpdate.iosStoreUrlMissing", { defaultValue: "App Store link is not configured." }));
        setPhase("ready");
        return;
      }
      try {
        setPhase("installing");
        await Linking.openURL(storeUrl);
        setVisible(false);
        setPhase("idle");
      } catch (err) {
        setError(parseError(err));
        setPhase("ready");
      }
      return;
    }
    if (!info.downloadUrl) return;
    setPhase("downloading");
    setProgress(null);
    try {
      const apkUri = await downloadApkUpdate(info.downloadUrl, info.versionCode, setProgress);
      setPhase("installing");
      await installDownloadedApk(apkUri);
      setVisible(false);
      setPhase("idle");
    } catch (err) {
      setError(parseError(err));
      setPhase("ready");
    }
  }, [info]);

  const dismiss = useCallback(() => {
    if (info?.forceUpdate) return;
    if (info?.versionCode) {
      void rememberDismissedVersionCode(info.versionCode);
    }
    setVisible(false);
    setPhase("idle");
  }, [info]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const runWithRetry = async (attempt: number) => {
      const result = await checkForUpdate({ silent: true });
      if (cancelled || result) return;
      if (attempt < 4) {
        setTimeout(() => {
          if (!cancelled) void runWithRetry(attempt + 1);
        }, 1500 * (attempt + 1));
      }
    };
    const timer = setTimeout(() => {
      void runWithRetry(0);
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkForUpdate, supported]);

  useEffect(() => {
    if (!supported) return;
    const onChange = (state: AppStateStatus) => {
      if (state === "active") {
        void checkForUpdate({ silent: true });
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [checkForUpdate, supported]);

  // An APP_UPDATE push bypasses the 15-minute throttle and the "dismissed" flag: the server
  // deliberately asked this device to update, so treat it like a manual check.
  useEffect(() => {
    if (!supported) return;
    return subscribeAppUpdateRequests(() => {
      void checkForUpdate({ manual: true, silent: true });
    });
  }, [checkForUpdate, supported]);

  return {
    visible,
    info,
    phase,
    progress,
    error,
    localVersion,
    supported,
    checkForUpdate,
    startDownload,
    dismiss,
  };
}

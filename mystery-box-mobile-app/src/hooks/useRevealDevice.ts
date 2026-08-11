import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useAppTheme } from "../context/ThemeContext";
import {
  resolveA11yFlashScale,
  resolveA11yLustreScale,
  shouldSkipParticles,
  shouldSkipShake,
  shouldSkipSound,
  shouldSkipTeaser,
} from "../effects/revealA11yTheme";
import {
  getRevealDegradeLevel,
  isRevealPerformanceDegraded,
  markRevealPerformanceDegraded,
} from "../effects/sessionPerf";
import { subscribeRevealOomGuard } from "../effects/revealOomGuard";
import { scheduleRevealGc } from "../effects/revealGcScheduler";
import { getRevealFocusMode } from "../effects/revealFocusMode";
import { updateRevealRefreshRateFromFps } from "../effects/revealRefreshRate";
import { setRevealPrefetchFpsHealthy } from "../effects/revealPrefetchGate";
import { getRevealRemoteConfig, type ReduceMotionLevel } from "../effects/revealRemote";
import { detectLowPerfDevice, isEmulatorOrLegacyOs, resolveEmulatorDegradeLevel } from "../effects/deviceProfile";
import {
  applyAgeTierToRevealMinorMode,
  setMinorAudioScale,
  setRevealMinorModeActive,
} from "../effects/revealMinorMode";
import { isRevealPowerSaverActive, refreshRevealPowerAdapt } from "../effects/revealPowerAdapt";
import { fetchIdentityStatus } from "../services/complianceService";
import {
  getRevealAnimationsEnabled,
  getRevealTextOnlyMode,
  getRuntimeRevealParticlesEnabled,
  setRevealAnimationsEnabled,
  setRevealTextOnlyMode,
} from "../utils/revealSettings";
import { getRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";
const FPS_SAMPLE_MS = 2000;
const LOW_FPS_THRESHOLD = 45;

export function useRevealDevice(authToken?: string | null) {
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [animationsEnabled, setAnimationsEnabledState] = useState(true);
  const [textOnlyMode, setTextOnlyModeState] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [degradeLevel, setDegradeLevel] = useState(() =>
    Math.max(getRevealDegradeLevel(), resolveEmulatorDegradeLevel()),
  );
  const [powerSaver, setPowerSaver] = useState(false);
  const fpsMonitorRef = useRef<{ rafId: number; last: number; frames: number; startedAt: number } | null>(null);

  const refreshPerf = useCallback(() => {
    setDegradeLevel(getRevealDegradeLevel());
    setPowerSaver(isRevealPowerSaverActive());
  }, []);

  const stopFpsMonitor = useCallback(() => {
    const monitor = fpsMonitorRef.current;
    if (!monitor) return;
    cancelAnimationFrame(monitor.rafId);
    fpsMonitorRef.current = null;
  }, []);

  const startFpsMonitor = useCallback(() => {
    stopFpsMonitor();
    const state = { rafId: 0, last: 0, frames: 0, startedAt: 0 };
    const tick = (now: number) => {
      if (!fpsMonitorRef.current) return;
      if (state.last > 0) {
        state.frames += 1;
        const elapsed = now - state.startedAt;
        if (elapsed >= FPS_SAMPLE_MS) {
          const fps = (state.frames * 1000) / elapsed;
          updateRevealRefreshRateFromFps(fps);
          if (fps < LOW_FPS_THRESHOLD) {
            markRevealPerformanceDegraded();
            setDegradeLevel(getRevealDegradeLevel());
            setRevealPrefetchFpsHealthy(false);
          } else {
            setRevealPrefetchFpsHealthy(true);
          }
          stopFpsMonitor();
          return;
        }
      } else {
        state.startedAt = now;
      }
      state.last = now;
      state.rafId = requestAnimationFrame(tick);
    };
    fpsMonitorRef.current = state;
    state.rafId = requestAnimationFrame(tick);
  }, [stopFpsMonitor]);

  useEffect(() => {
    if (isEmulatorOrLegacyOs()) {
      markRevealPerformanceDegraded();
    }
    void refreshRevealPowerAdapt().then((active) => {
      setPowerSaver(active);
      if (active) setDegradeLevel((level) => Math.max(level, 1));
    });
    // Feature flag is a fallback until identity status loads.
    setRevealMinorModeActive(getRuntimeFeatureFlags()?.minorMode === true);
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduceMotion).catch(() => setOsReduceMotion(false));
    void getRevealAnimationsEnabled().then(setAnimationsEnabledState);
    void getRevealTextOnlyMode().then(setTextOnlyModeState);
    AccessibilityInfo.isHighTextContrastEnabled?.()
      ?.then(setHighContrast)
      ?.catch(() => setHighContrast(false));
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setOsReduceMotion);
    const oomUnsub = subscribeRevealOomGuard((level) => {
      setDegradeLevel(level);
      scheduleRevealGc("memory_warning");
    });
    return () => {
      sub?.remove?.();
      oomUnsub();
      stopFpsMonitor();
    };
  }, [stopFpsMonitor]);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    void fetchIdentityStatus(authToken)
      .then((status) => {
        if (cancelled || !status) return;
        applyAgeTierToRevealMinorMode(status.ageTier, status.minor);
        if (typeof status.audioVolumeScale === "number") {
          setMinorAudioScale(status.audioVolumeScale);
        }
      })
      .catch(() => {
        /* keep feature-flag fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const setAnimationsEnabled = useCallback(async (enabled: boolean) => {
    await setRevealAnimationsEnabled(enabled);
    setAnimationsEnabledState(enabled);
  }, []);

  const setTextOnlyMode = useCallback(async (enabled: boolean) => {
    await setRevealTextOnlyMode(enabled);
    setTextOnlyModeState(enabled);
  }, []);

  const remoteLevel = getRevealRemoteConfig().reduceMotionLevel;
  const reduceMotionLevel: ReduceMotionLevel = textOnlyMode
    ? "heavy"
    : osReduceMotion
      ? remoteLevel
      : animationsEnabled
        ? "light"
        : "medium";

  const skipAnimations =
    reduceMotionLevel === "heavy" ||
    reduceMotionLevel === "medium" ||
    !animationsEnabled ||
    textOnlyMode;

  const lowPerfMode =
    isRevealPerformanceDegraded() ||
    skipAnimations ||
    degradeLevel >= 1 ||
    powerSaver ||
    detectLowPerfDevice();
  const { isDark } = useAppTheme();
  const remote = getRevealRemoteConfig();
  const a11yFlashScale = useMemo(
    () => resolveA11yFlashScale(remote.flashScale, highContrast, isDark),
    [remote.flashScale, highContrast, isDark],
  );
  const a11yLustreScale = useMemo(
    () => resolveA11yLustreScale(remote.lustreScale, highContrast, isDark),
    [remote.lustreScale, highContrast, isDark],
  );
  const skipParticles =
    shouldSkipParticles(reduceMotionLevel, degradeLevel) ||
    !getRuntimeRevealParticlesEnabled() ||
    getRevealFocusMode();
  const skipTeaserAnim = shouldSkipTeaser(reduceMotionLevel, degradeLevel);
  const skipShake = shouldSkipShake(reduceMotionLevel, degradeLevel);
  const skipRevealSound = shouldSkipSound(reduceMotionLevel);

  return {
    reduceMotion: skipAnimations,
    reduceMotionLevel,
    highContrast,
    animationsEnabled,
    textOnlyMode,
    setAnimationsEnabled,
    setTextOnlyMode,
    lowPerfMode,
    degradeLevel,
    a11yFlashScale,
    a11yLustreScale,
    skipParticles,
    skipTeaserAnim,
    skipShake,
    skipRevealSound,
    focusMode: getRevealFocusMode(),
    refreshPerf,
    startFpsMonitor,
    stopFpsMonitor,
  };
}

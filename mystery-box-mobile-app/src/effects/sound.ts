import { AppState, Platform, type AppStateStatus } from "react-native";
import type { AudioPlayer } from "expo-audio";
import type { PrizeTier } from "./config";
import { normalizeCeremonyTier } from "./ceremonyTier";
import { REVEAL_SOUND_SYNC } from "./revealTiming";
import type { RevealPacing } from "./revealSequence";
import { getRevealRemoteConfig } from "./revealRemote";
import { acceleratePlaybackRate } from "./revealSkipPolicy";
import { playRevealHapticQueued } from "./revealHaptics";
import {
  getRuntimeRevealSoundLayers,
  getRevealVoiceLineEnabled,
  type RevealSoundPack,
} from "../utils/revealSettings";
import { resolveRevealAudioMultiplier } from "./revealAudioAdapt";
import { resolveAudioRouteMultiplier } from "./revealAudioRouteAdapt";
import { resolvePanVolumeScale, resolveRevealSoundPan } from "./revealAudioSpatial";
import { resolveActiveEmotionProfile } from "./revealEmotionProfiles";
import { getMinorAudioScale, setMinorAudioScale } from "./revealMinorMode";
import { trackEffectEvent } from "./telemetry";
import type { RevealThemeId } from "./revealTheme";
import { canonicalizeRevealThemeId } from "./revealTheme";
import { resolveTierVoiceLineUri } from "./revealVoiceLines";

export { setMinorAudioScale, resolveTierVoiceLineUri };

let _audioReady = false;

/** Runtime theme pack drives which dedicated SFX bank is loaded. */
export type ThemeSoundBank = "classic" | "cyberpunk" | "asmr" | "party" | "adventure";

let runtimeThemeSoundBank: ThemeSoundBank = "classic";
let runtimeRevealSoundPack: RevealSoundPack = "classic";

const SOUND_PACK_PLAYBACK_RATE: Record<RevealSoundPack, number> = {
  classic: 1,
  cute: 0.98,
  neon: 1.06,
  minimal: 0.94,
};

const THEME_BANK_PLAYBACK_RATE: Record<ThemeSoundBank, number> = {
  classic: 1,
  cyberpunk: 1.04,
  asmr: 0.96,
  party: 1.05,
  adventure: 1.0,
};

type SoundKey = "GENERAL" | "HIDDEN" | "LEGENDARY" | "CHARGE" | "AMBIENT";

type BankModules = Record<SoundKey, number>;

/**
 * Metro needs static require() paths. Each bank is loaded only on first use via a
 * getter (not all five at module init).
 */
const BANK_MODULE_LOADERS: Record<ThemeSoundBank, () => BankModules> = {
  classic: () => ({
    GENERAL: require("../assets/sounds/classic/general.wav"),
    HIDDEN: require("../assets/sounds/classic/hidden.wav"),
    LEGENDARY: require("../assets/sounds/classic/legendary.wav"),
    CHARGE: require("../assets/sounds/classic/charge.wav"),
    AMBIENT: require("../assets/sounds/classic/ambient.wav"),
  }),
  cyberpunk: () => ({
    GENERAL: require("../assets/sounds/cyberpunk/general.wav"),
    HIDDEN: require("../assets/sounds/cyberpunk/hidden.wav"),
    LEGENDARY: require("../assets/sounds/cyberpunk/legendary.wav"),
    CHARGE: require("../assets/sounds/cyberpunk/charge.wav"),
    AMBIENT: require("../assets/sounds/cyberpunk/ambient.wav"),
  }),
  asmr: () => ({
    GENERAL: require("../assets/sounds/asmr/general.wav"),
    HIDDEN: require("../assets/sounds/asmr/hidden.wav"),
    LEGENDARY: require("../assets/sounds/asmr/legendary.wav"),
    CHARGE: require("../assets/sounds/asmr/charge.wav"),
    AMBIENT: require("../assets/sounds/asmr/ambient.wav"),
  }),
  party: () => ({
    GENERAL: require("../assets/sounds/party/general.wav"),
    HIDDEN: require("../assets/sounds/party/hidden.wav"),
    LEGENDARY: require("../assets/sounds/party/legendary.wav"),
    CHARGE: require("../assets/sounds/party/charge.wav"),
    AMBIENT: require("../assets/sounds/party/ambient.wav"),
  }),
  adventure: () => ({
    GENERAL: require("../assets/sounds/adventure/general.wav"),
    HIDDEN: require("../assets/sounds/adventure/hidden.wav"),
    LEGENDARY: require("../assets/sounds/adventure/legendary.wav"),
    CHARGE: require("../assets/sounds/adventure/charge.wav"),
    AMBIENT: require("../assets/sounds/adventure/ambient.wav"),
  }),
};

const loadedBankModules = new Map<ThemeSoundBank, BankModules>();

function getBankModules(bank: ThemeSoundBank): BankModules {
  const cached = loadedBankModules.get(bank);
  if (cached) return cached;
  const loader = BANK_MODULE_LOADERS[bank] ?? BANK_MODULE_LOADERS.classic;
  const modules = loader();
  loadedBankModules.set(bank, modules);
  return modules;
}

/** Map Doc2 / RevealThemeId / sound-pack aliases onto a dedicated bank. */
export function resolveThemeSoundBank(themeOrPack?: string | null): ThemeSoundBank {
  const raw = (themeOrPack ?? "").trim().toLowerCase();
  if (!raw) return "classic";
  if (raw === "cyberpunk" || raw === "neon" || raw === "glitch") return "cyberpunk";
  if (raw === "asmr" || raw === "cute" || raw === "healing" || raw === "minimal") return "asmr";
  if (raw === "party" || raw === "carnival" || raw === "luxury") return "party";
  if (raw === "adventure" || raw === "narrative" || raw === "default") return "adventure";
  if (raw === "classic") return "classic";
  const id = canonicalizeRevealThemeId(raw);
  if (id === "neon") return "cyberpunk";
  if (id === "cute") return "asmr";
  if (id === "luxury") return "party";
  if (id === "default") return "adventure";
  return "classic";
}

export function setRuntimeRevealSoundPack(pack: RevealSoundPack) {
  runtimeRevealSoundPack = pack;
  const nextBank = resolveThemeSoundBank(pack);
  if (nextBank !== runtimeThemeSoundBank) {
    clearSoundCache();
    runtimeThemeSoundBank = nextBank;
  }
}

/** Bind open-box SFX bank to the active reveal theme (call when theme resolves). */
export function setRuntimeThemeSoundBankFromTheme(themeId?: string | RevealThemeId | null) {
  const next = resolveThemeSoundBank(themeId ?? null);
  if (next === runtimeThemeSoundBank) return;
  clearSoundCache();
  runtimeThemeSoundBank = next;
  trackEffectEvent("reveal_sound_bank_switched", { bank: next, themeId: themeId ?? "" });
}

export function getRuntimeThemeSoundBank(): ThemeSoundBank {
  return runtimeThemeSoundBank;
}

function resolveSoundPackPlaybackMultiplier(): number {
  return (
    (SOUND_PACK_PLAYBACK_RATE[runtimeRevealSoundPack] ?? 1) *
    (THEME_BANK_PLAYBACK_RATE[runtimeThemeSoundBank] ?? 1)
  );
}

const soundCache = new Map<string, AudioPlayer>();
const soundTimers = new Set<ReturnType<typeof setTimeout>>();
const activePlayers = new Set<AudioPlayer>();
const playerStartedAt = new WeakMap<AudioPlayer, number>();

export type SoundLayer = "ambient" | "charge" | "reveal" | "finale";

let ambientLoopActive = false;
let ambientPlayer: AudioPlayer | null = null;
let ambientFadeToken = 0;
const AMBIENT_BED_VOLUME = 0.15;
const AMBIENT_DUCK_VOLUME = 0.05;
const MIN_TIER_SOUND_PLAY_MS = 160;
/** Keep reveals audible even when minor/emotion scales stack low (unless explicitly muted). */
const BASE_VOLUME = 1;
const MIN_AUDIBLE_VOLUME = 0.55;

function cacheKey(key: SoundKey): string {
  return `${runtimeThemeSoundBank}:${key}`;
}

function soundKeyForTier(tier: PrizeTier): SoundKey {
  const ceremony = normalizeCeremonyTier(tier);
  if (ceremony === "TREASURE_LEGEND" || ceremony === "PEERLESS" || ceremony === "TREASURE_PEERLESS") {
    return "LEGENDARY";
  }
  if (ceremony === "HIDDEN") return "HIDDEN";
  return "GENERAL";
}

function resolveSoundSource(key: SoundKey): number | null {
  const bank = getBankModules(runtimeThemeSoundBank);
  return bank[key] ?? null;
}

async function loadAudioModule() {
  try {
    return await import("expo-audio");
  } catch {
    return null;
  }
}

async function ensureAudio() {
  const audio = await loadAudioModule();
  if (!audio) return false;
  try {
    // Short SFX should mix; doNotMix can fail to acquire focus on Android and mute everything.
    await audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
      shouldRouteThroughEarpiece: false,
    });
    if (typeof audio.setIsAudioActiveAsync === "function") {
      await audio.setIsAudioActiveAsync(true);
    }
    _audioReady = true;
    return true;
  } catch {
    try {
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
      });
      if (typeof audio.setIsAudioActiveAsync === "function") {
        await audio.setIsAudioActiveAsync(true);
      }
      _audioReady = true;
      return true;
    } catch {
      _audioReady = false;
      return false;
    }
  }
}

function clearSoundCache() {
  stopAmbientPlayer(true);
  for (const player of soundCache.values()) {
    try {
      player.pause?.();
      player.remove?.();
    } catch {
      /* ignore */
    }
  }
  soundCache.clear();
}

function setPlayerVolume(player: AudioPlayer, volume: number) {
  if ("volume" in player) {
    (player as AudioPlayer & { volume?: number }).volume = Math.min(1, Math.max(0, volume));
  }
}

function setPlayerLoop(player: AudioPlayer, loop: boolean) {
  if ("loop" in player) {
    (player as AudioPlayer & { loop?: boolean }).loop = loop;
  }
}

async function waitUntilLoaded(player: AudioPlayer, timeoutMs = 1500): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const loaded =
      (player as AudioPlayer & { isLoaded?: boolean }).isLoaded === true ||
      (player.currentStatus?.isLoaded ?? false);
    if (loaded) return true;
    await new Promise((r) => setTimeout(r, 30));
  }
  const loaded =
    (player as AudioPlayer & { isLoaded?: boolean }).isLoaded === true ||
    (player.currentStatus?.isLoaded ?? false);
  return loaded === true;
}

function resolvePlayVolume(): number {
  const minor = getMinorAudioScale();
  if (minor <= 0) return 0;
  const volumeScale =
    resolveRevealAudioMultiplier() *
    resolveAudioRouteMultiplier() *
    resolveActiveEmotionProfile().volumeScale *
    Math.max(0.35, minor);
  if (volumeScale <= 0) return 0;
  const raw = BASE_VOLUME * volumeScale;
  // Floor keeps adult SFX audible on quiet devices; do not override teen attenuation.
  if (minor < 1) return Math.min(1, Math.max(0.08, raw));
  return Math.min(1, Math.max(MIN_AUDIBLE_VOLUME, raw));
}

function resolveAmbientVolume(): number {
  const base = resolvePlayVolume();
  if (base <= 0) return 0;
  return Math.min(AMBIENT_BED_VOLUME, Math.max(0.02, base * 0.22));
}

async function loadSoundKey(key: SoundKey) {
  const ck = cacheKey(key);
  const cached = soundCache.get(ck);
  if (cached) return cached;
  const source = resolveSoundSource(key);
  if (source == null) return null;
  const audio = await loadAudioModule();
  if (!audio) return null;
  try {
    const player = audio.createAudioPlayer(source, {
      updateInterval: 250,
      keepAudioSessionActive: true,
    });
    soundCache.set(ck, player);
    await waitUntilLoaded(player);
    return player;
  } catch {
    return null;
  }
}

/** One-shot player — avoids stuck-at-end cache issues that silently skip replay. */
async function createOneShotPlayer(key: SoundKey): Promise<AudioPlayer | null> {
  const source = resolveSoundSource(key);
  if (source == null) return null;
  return createOneShotPlayerFromSource(source);
}

async function createOneShotPlayerFromSource(source: number | { uri: string }): Promise<AudioPlayer | null> {
  const audio = await loadAudioModule();
  if (!audio) return null;
  try {
    const player = audio.createAudioPlayer(source, {
      updateInterval: 250,
      keepAudioSessionActive: true,
    });
    await waitUntilLoaded(player);
    return player;
  } catch {
    return null;
  }
}

async function playHapticFallback(tier: PrizeTier) {
  playRevealHapticQueued(tier);
}

function applyPlayerGain(player: AudioPlayer, rate: number, pan = 0) {
  const playbackRate = Math.min(1.28, Math.max(0.85, rate * resolveSoundPackPlaybackMultiplier()));
  const targetVolume = resolvePlayVolume() * resolvePanVolumeScale(pan);
  if ("setPlaybackRate" in player && typeof player.setPlaybackRate === "function") {
    player.setPlaybackRate(playbackRate);
  } else if ("playbackRate" in player) {
    (player as AudioPlayer & { playbackRate?: number }).playbackRate = playbackRate;
  }
  if ("volume" in player) {
    (player as AudioPlayer & { volume?: number }).volume = Math.min(1, Math.max(0, targetVolume));
  }
  return { playbackRate, targetVolume };
}

function schedulePlayerCleanup(player: AudioPlayer, ms = 2800) {
  const timer = setTimeout(() => {
    soundTimers.delete(timer);
    activePlayers.delete(player);
    try {
      player.pause?.();
      player.remove?.();
    } catch {
      /* ignore */
    }
  }, ms);
  soundTimers.add(timer);
}

async function playSoundKey(key: SoundKey, tier: PrizeTier, enabled: boolean, rate = 1, pan = 0) {
  if (!enabled) return;
  const ok = await ensureAudio();
  if (!ok) {
    await playHapticFallback(tier);
    trackEffectEvent("reveal_sound_skipped_runtime", { tier, platform: Platform.OS });
    return;
  }
  const volume = resolvePlayVolume();
  if (volume <= 0) {
    trackEffectEvent("reveal_sound_skipped_muted", { tier, key, bank: runtimeThemeSoundBank });
    return;
  }
  try {
    // Prefer one-shot so each hit is audible; fall back to warmed cache.
    let player = await createOneShotPlayer(key);
    let oneShot = true;
    if (!player) {
      player = await loadSoundKey(key);
      oneShot = false;
    }
    if (!player) {
      await playHapticFallback(tier);
      trackEffectEvent("reveal_sound_skipped_no_asset", { tier, key, bank: runtimeThemeSoundBank });
      return;
    }
    const { playbackRate, targetVolume } = applyPlayerGain(player, rate, pan);
    if (targetVolume <= 0) {
      if (oneShot) {
        try {
          player.remove?.();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    // Avoid pause() on a fresh player — it can deactivate the audio session on iOS/Android.
    try {
      const status = player.currentStatus;
      if (status?.playing) {
        player.pause();
      }
      if ((status?.currentTime ?? 0) > 0.01) {
        await player.seekTo(0);
      }
    } catch {
      try {
        await player.seekTo(0);
      } catch {
        /* ignore */
      }
    }
    player.play();
    playerStartedAt.set(player, Date.now());
    activePlayers.add(player);
    if (oneShot) schedulePlayerCleanup(player);
    trackEffectEvent("reveal_sound_play", {
      tier,
      key,
      bank: runtimeThemeSoundBank,
      playbackRate,
      volume: targetVolume,
      oneShot,
    });
  } catch (err) {
    await playHapticFallback(tier);
    trackEffectEvent("reveal_sound_play_failed", {
      tier,
      key,
      bank: runtimeThemeSoundBank,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function playTierSound(tier: PrizeTier, enabled: boolean) {
  await playSoundKey(soundKeyForTier(tier), tier, enabled);
}

export async function playChargeSound(tier: PrizeTier, enabled: boolean) {
  if (!enabled || !getRuntimeRevealSoundLayers().charge) return;
  await playSoundKey("CHARGE", tier, enabled, 1);
}

export function playTierSoundSynced(
  tier: PrizeTier,
  enabled: boolean,
  opts?: { afterBoxTeaser?: boolean; delayExtraMs?: number },
) {
  const delay =
    (opts?.afterBoxTeaser ? REVEAL_SOUND_SYNC.afterBoxTeaserMs : REVEAL_SOUND_SYNC.flashPeakMs) +
    (opts?.delayExtraMs ?? 0);
  const timer = setTimeout(() => {
    soundTimers.delete(timer);
    void playTierSound(tier, enabled);
  }, delay);
  soundTimers.add(timer);
}

export function playChargeSoundSynced(
  tier: PrizeTier,
  enabled: boolean,
  chargeMs: number,
  opts?: { afterBoxTeaser?: boolean },
) {
  if (!enabled || chargeMs <= 0) return;
  // Fire charge almost immediately so it is not cancelled by fast skip / multi-draw stopAll.
  const base = opts?.afterBoxTeaser ? Math.min(120, REVEAL_SOUND_SYNC.afterBoxTeaserMs) : 0;
  const timer = setTimeout(() => {
    soundTimers.delete(timer);
    void playChargeSound(tier, enabled);
  }, Math.max(0, base));
  soundTimers.add(timer);
}

export type RevealSoundArcOptions = {
  tier: PrizeTier;
  revealIndex?: number;
  totalReveals?: number;
  pacing?: RevealPacing;
  isFinaleDraw?: boolean;
  soundEnabled: boolean;
  afterBoxTeaser?: boolean;
  chargeMs: number;
  accelerateTier?: 0 | 1 | 2;
  themeId?: string | null;
};

async function playTierSoundWithRate(
  tier: PrizeTier,
  enabled: boolean,
  rate: number,
  opts?: { pan?: number; revealIndex?: number; totalReveals?: number; isFinaleDraw?: boolean },
) {
  const pan =
    opts?.pan ??
    resolveRevealSoundPan(opts?.revealIndex ?? 0, opts?.totalReveals ?? 1, opts?.isFinaleDraw ?? false);
  await playSoundKey(soundKeyForTier(tier), tier, enabled, rate, pan);
}

export function canStopRevealPlayer(player: AudioPlayer): boolean {
  const started = playerStartedAt.get(player);
  if (!started) return true;
  return Date.now() - started >= MIN_TIER_SOUND_PLAY_MS;
}

/** Escalating reveal sound arc with optional silence before finale tier hit. */
export function playRevealSoundArc(opts: RevealSoundArcOptions) {
  const {
    tier,
    revealIndex = 0,
    isFinaleDraw = false,
    soundEnabled,
    afterBoxTeaser = false,
    chargeMs,
    pacing = "normal",
    accelerateTier = 0,
    themeId,
  } = opts;
  if (!soundEnabled) return;
  if (themeId) setRuntimeThemeSoundBankFromTheme(themeId);

  const layers = getRuntimeRevealSoundLayers();
  const remote = getRevealRemoteConfig();
  if (layers.ambient && !ambientLoopActive) {
    void startAmbientLoop(true);
  }
  const indexPitchDelay = Math.min(80, revealIndex * 24);
  if (layers.charge !== false) {
    void crossfadeSoundLayers("ambient", "charge", Math.min(180, remote.audioFadeOutMs || 120));
    playChargeSoundSynced(tier, soundEnabled, Math.max(chargeMs, 400), { afterBoxTeaser });
  }
  const finaleSilence = isFinaleDraw ? remote.silenceBeforeFinaleMs : 0;
  const pacingScale = pacing === "fast" ? 0.9 : pacing === "finale" || pacing === "ceremony" ? 1.05 : 1;
  const playbackRate = acceleratePlaybackRate(accelerateTier, 1 + revealIndex * 0.04) * pacingScale;
  const revealLayerOk = isFinaleDraw ? layers.finale !== false : layers.reveal !== false;
  if (!revealLayerOk) return;
  void crossfadeSoundLayers("ambient", isFinaleDraw ? "finale" : "reveal", remote.audioFadeOutMs || 160);

  // Keep tier hit close to the visual flash — long chargeMs used to schedule after finishReveal cancelled timers.
  const ceremony = normalizeCeremonyTier(tier);
  const chargeLead =
    ceremony === "GENERAL"
      ? Math.min(160, Math.max(60, chargeMs * 0.2))
      : Math.min(280, Math.max(90, chargeMs * 0.25));
  let tierDelayBase =
    (afterBoxTeaser ? Math.min(160, REVEAL_SOUND_SYNC.afterBoxTeaserMs) : REVEAL_SOUND_SYNC.flashPeakMs) +
    chargeLead +
    indexPitchDelay;
  if ((opts.totalReveals ?? 1) > 1) {
    tierDelayBase = Math.min(tierDelayBase, pacing === "fast" ? 60 : pacing === "normal" ? 110 : 180);
  }
  const timer = setTimeout(() => {
    soundTimers.delete(timer);
    if (finaleSilence > 0 && layers.ambient) {
      void playAmbientBed(finaleSilence);
    }
    void playTierSoundWithRate(tier, soundEnabled, playbackRate, {
      revealIndex,
      totalReveals: opts.totalReveals ?? 1,
      isFinaleDraw,
    });
    void getRevealVoiceLineEnabled().then((enabled) => {
      if (enabled) void playTierVoiceLine(tier, remote.themeId);
    });
  }, Math.max(0, tierDelayBase + finaleSilence));
  soundTimers.add(timer);
}

async function startAmbientLoop(enabled: boolean) {
  if (!enabled || ambientLoopActive) return;
  if (!getRuntimeRevealSoundLayers().ambient) return;
  if (resolvePlayVolume() <= 0) return;
  ambientLoopActive = true;
  await playAmbientLoop();
}

/** Ensure looping ambient bed is audible (e.g. during finale silence). */
async function playAmbientBed(_ms: number) {
  if (!getRuntimeRevealSoundLayers().ambient) return;
  if (ambientLoopActive && ambientPlayer) {
    setPlayerVolume(ambientPlayer, resolveAmbientVolume());
    return;
  }
  await startAmbientLoop(true);
}

async function playAmbientLoop() {
  if (!getRuntimeRevealSoundLayers().ambient) {
    ambientLoopActive = false;
    return;
  }
  const ok = await ensureAudio();
  if (!ok) {
    ambientLoopActive = false;
    return;
  }
  try {
    stopAmbientPlayer(false);
    let player = await createOneShotPlayer("AMBIENT");
    if (!player) {
      // Fallback if ambient.wav not yet generated for this bank
      player = await createOneShotPlayer("CHARGE");
    }
    if (!player) {
      ambientLoopActive = false;
      return;
    }
    ambientPlayer = player;
    setPlayerLoop(player, true);
    setPlayerVolume(player, 0);
    try {
      const status = player.currentStatus;
      if ((status?.currentTime ?? 0) > 0.01) {
        await player.seekTo(0);
      }
    } catch {
      try {
        await player.seekTo(0);
      } catch {
        /* ignore */
      }
    }
    player.play();
    playerStartedAt.set(player, Date.now());
    activePlayers.add(player);
    const ambientVol = resolveAmbientVolume();
    if (ambientVol <= 0) {
      stopAmbientPlayer(true);
      return;
    }
    await rampAmbientVolume(0, ambientVol, 220);
    trackEffectEvent("reveal_sound_ambient_bed", {
      volume: ambientVol,
      bank: runtimeThemeSoundBank,
      loop: true,
    });
  } catch (err) {
    ambientLoopActive = false;
    trackEffectEvent("reveal_sound_ambient_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function stopAmbientPlayer(resetFlag = true) {
  ambientFadeToken += 1;
  if (ambientPlayer) {
    try {
      ambientPlayer.pause?.();
      ambientPlayer.remove?.();
    } catch {
      /* ignore */
    }
    activePlayers.delete(ambientPlayer);
    ambientPlayer = null;
  }
  if (resetFlag) ambientLoopActive = false;
}

async function rampAmbientVolume(from: number, to: number, fadeMs: number) {
  const player = ambientPlayer;
  if (!player) return;
  const token = ++ambientFadeToken;
  const ms = Math.max(0, fadeMs);
  if (ms <= 0) {
    setPlayerVolume(player, to);
    return;
  }
  const steps = Math.max(4, Math.min(16, Math.round(ms / 30)));
  const stepMs = ms / steps;
  for (let i = 1; i <= steps; i++) {
    if (token !== ambientFadeToken || ambientPlayer !== player) return;
    const t = i / steps;
    setPlayerVolume(player, from + (to - from) * t);
    await new Promise((r) => setTimeout(r, stepMs));
  }
}

/** Duck / restore ambient against charge & reveal hits (simple volume ramp). */
async function crossfadeSoundLayers(_from: SoundLayer | null, to: SoundLayer, fadeMs: number) {
  if (!ambientPlayer || !ambientLoopActive) return;
  const ms = Math.max(40, fadeMs || 120);
  const duck =
    to === "charge" ? Math.max(AMBIENT_DUCK_VOLUME, AMBIENT_BED_VOLUME * 0.45) : AMBIENT_DUCK_VOLUME;
  await rampAmbientVolume(AMBIENT_BED_VOLUME, duck, Math.min(ms, 180));
  if (!ambientPlayer || !ambientLoopActive) return;
  await rampAmbientVolume(duck, AMBIENT_BED_VOLUME, Math.min(ms, 220));
}

async function fadeOutAndStopAmbient(fadeMs: number) {
  const player = ambientPlayer;
  if (!player) {
    stopAmbientPlayer(true);
    return;
  }
  const current =
    typeof (player as AudioPlayer & { volume?: number }).volume === "number"
      ? ((player as AudioPlayer & { volume?: number }).volume as number)
      : AMBIENT_BED_VOLUME;
  await rampAmbientVolume(current, 0, fadeMs);
  stopAmbientPlayer(true);
}

async function playTierVoiceLine(tier: PrizeTier, themeId?: string) {
  try {
    const remote = getRevealRemoteConfig();
    const uri = resolveTierVoiceLineUri(tier, themeId ?? remote.themeId, remote.voiceLineUris);
    if (!uri) return;
    const ok = await ensureAudio();
    if (!ok) return;
    const volume = resolvePlayVolume();
    if (volume <= 0) return;
    const player = await createOneShotPlayerFromSource({ uri });
    if (!player) return;
    setPlayerLoop(player, false);
    applyPlayerGain(player, 1);
    try {
      const status = player.currentStatus;
      if (status?.playing) player.pause();
      if ((status?.currentTime ?? 0) > 0.01) await player.seekTo(0);
    } catch {
      try {
        await player.seekTo(0);
      } catch {
        /* ignore */
      }
    }
    player.play();
    playerStartedAt.set(player, Date.now());
    activePlayers.add(player);
    schedulePlayerCleanup(player, 4200);
    trackEffectEvent("reveal_sound_voice_line", {
      tier: normalizeCeremonyTier(tier),
      themeId: themeId ?? remote.themeId ?? "",
    });
  } catch {
    /* optional asset — never crash the reveal arc */
  }
}

export function cancelScheduledRevealSounds(opts?: { fadeMs?: number; stopActive?: boolean }) {
  for (const timer of soundTimers) clearTimeout(timer);
  soundTimers.clear();
  const fadeMs = opts?.fadeMs ?? 0;
  if (fadeMs > 0 && ambientPlayer) {
    void fadeOutAndStopAmbient(fadeMs);
  } else {
    stopAmbientPlayer(true);
  }
  // Hard cancel / explicit stopActive clears one-shots so accelerate & multi-draw never stack.
  if (fadeMs === 0 || opts?.stopActive) {
    stopActiveRevealSounds({ force: true });
  }
}

export function cancelScheduledRevealSoundTimers() {
  cancelScheduledRevealSounds();
}

export function stopActiveRevealSounds(opts?: { force?: boolean }) {
  const keep = new Set<AudioPlayer>();
  activePlayers.forEach((p) => {
    if (p === ambientPlayer) {
      keep.add(p);
      return;
    }
    try {
      if (!opts?.force && !canStopRevealPlayer(p)) {
        keep.add(p);
        return;
      }
      p.pause?.();
      if (opts?.force) {
        try {
          p.remove?.();
        } catch {
          /* ignore */
        }
        playerStartedAt.delete(p);
      }
    } catch {
      /* ignore */
    }
  });
  activePlayers.clear();
  keep.forEach((p) => activePlayers.add(p));
}

export async function warmupTierSounds() {
  const ok = await ensureAudio();
  if (!ok) {
    trackEffectEvent("reveal_sound_warmup_skipped");
    return;
  }
  await Promise.all(
    (["GENERAL", "HIDDEN", "LEGENDARY", "CHARGE", "AMBIENT"] as SoundKey[]).map((key) =>
      loadSoundKey(key).catch(() => undefined),
    ),
  );
  trackEffectEvent("reveal_sound_warmup_ok", { bank: runtimeThemeSoundBank });
}


let ambientAppStateAttached = false;
function attachAmbientAppStateResume() {
  if (ambientAppStateAttached) return;
  ambientAppStateAttached = true;
  let last: AppStateStatus = AppState.currentState;
  AppState.addEventListener("change", (next) => {
    if (last.match(/inactive|background/) && next === "active") {
      if (ambientLoopActive && ambientPlayer && resolvePlayVolume() > 0) {
        try {
          ambientPlayer.play?.();
          setPlayerVolume(ambientPlayer, resolveAmbientVolume());
        } catch {
          /* ignore */
        }
      }
    }
    last = next;
  });
}
attachAmbientAppStateResume();

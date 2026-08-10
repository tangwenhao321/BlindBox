import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
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
} from "../utils/revealSettings";
import { resolveRevealAudioMultiplier } from "./revealAudioAdapt";
import { resolveAudioRouteMultiplier } from "./revealAudioRouteAdapt";
import { resolvePanVolumeScale, resolveRevealSoundPan } from "./revealAudioSpatial";
import { resolveActiveEmotionProfile } from "./revealEmotionProfiles";
import { trackEffectEvent } from "./telemetry";
import type { RevealSoundPack } from "../utils/revealSettings";

let audioReady = false;
let runtimeRevealSoundPack: RevealSoundPack = "classic";

const SOUND_PACK_PLAYBACK_RATE: Record<RevealSoundPack, number> = {
  classic: 1,
  cute: 1.08,
  neon: 1.14,
  minimal: 0.92,
};

export function setRuntimeRevealSoundPack(pack: RevealSoundPack) {
  runtimeRevealSoundPack = pack;
}

function resolveSoundPackPlaybackMultiplier(): number {
  return SOUND_PACK_PLAYBACK_RATE[runtimeRevealSoundPack] ?? 1;
}

const soundCache = new Map<SoundKey, AudioPlayer>();
const soundTimers = new Set<ReturnType<typeof setTimeout>>();
const activePlayers = new Set<AudioPlayer>();

type SoundKey = "GENERAL" | "HIDDEN" | "LEGENDARY" | "CHARGE";

export type SoundLayer = "ambient" | "charge" | "reveal" | "finale";

let ambientLoopActive = false;
const MIN_TIER_SOUND_PLAY_MS = 120;
const playerStartedAt = new WeakMap<AudioPlayer, number>();

function soundKeyForTier(tier: PrizeTier): SoundKey {
  const ceremony = normalizeCeremonyTier(tier);
  if (ceremony === "TREASURE_LEGEND" || ceremony === "PEERLESS" || ceremony === "TREASURE_PEERLESS") {
    return "LEGENDARY";
  }
  if (ceremony === "HIDDEN") return "HIDDEN";
  return "GENERAL";
}

const LOCAL_SOUND_MODULES: Partial<Record<SoundKey, number>> = {
  GENERAL: require("../assets/sounds/general.wav"),
  HIDDEN: require("../assets/sounds/hidden.wav"),
  LEGENDARY: require("../assets/sounds/legendary.wav"),
  CHARGE: require("../assets/sounds/charge.wav"),
};

const REMOTE_SOUND_URI: Partial<Record<SoundKey, string>> = {
  GENERAL: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b6cbe3f2.mp3",
  HIDDEN: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb7709cca.mp3",
  LEGENDARY: "https://cdn.pixabay.com/download/audio/2022/03/24/audio_128a1c123c.mp3",
  CHARGE: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_8f8c8e8f8c.mp3",
};

async function loadAudioModule() {
  try {
    return await import("expo-audio");
  } catch {
    return null;
  }
}

async function ensureAudio() {
  if (audioReady) return true;
  const audio = await loadAudioModule();
  if (!audio) return false;
  try {
    await audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    });
    audioReady = true;
    return true;
  } catch {
    return false;
  }
}

function resolveSoundSource(key: SoundKey): number | { uri: string } | null {
  const local = LOCAL_SOUND_MODULES[key];
  if (local != null) return local;
  const remote = REMOTE_SOUND_URI[key];
  return remote ? { uri: remote } : null;
}

async function loadSoundKey(key: SoundKey) {
  const cached = soundCache.get(key);
  if (cached) return cached;
  const source = resolveSoundSource(key);
  if (!source) return null;
  const audio = await loadAudioModule();
  if (!audio) return null;
  try {
    const player = audio.createAudioPlayer(source);
    soundCache.set(key, player);
    return player;
  } catch {
    return null;
  }
}

async function loadSound(tier: PrizeTier) {
  return loadSoundKey(soundKeyForTier(tier));
}

async function playHapticFallback(tier: PrizeTier) {
  playRevealHapticQueued(tier);
}

async function playSoundKey(key: SoundKey, tier: PrizeTier, enabled: boolean) {
  if (!enabled) return;
  const ok = await ensureAudio();
  if (!ok) {
    await playHapticFallback(tier);
    trackEffectEvent("reveal_sound_skipped_runtime", { tier, platform: Platform.OS });
    return;
  }
  try {
    const player = await loadSoundKey(key);
    if (!player) {
      await playHapticFallback(tier);
      trackEffectEvent("reveal_sound_skipped_no_asset", { tier, key });
      return;
    }
    await player.seekTo(0);
    player.play();
    activePlayers.add(player);
    trackEffectEvent("reveal_sound_play", { tier, key });
  } catch {
    await playHapticFallback(tier);
    trackEffectEvent("reveal_sound_play_failed", { tier, key });
  }
}

export async function playTierSound(tier: PrizeTier, enabled: boolean) {
  await playSoundKey(soundKeyForTier(tier), tier, enabled);
}

export async function playChargeSound(tier: PrizeTier, enabled: boolean) {
  if (!enabled || !getRuntimeRevealSoundLayers().charge) return;
  const ceremony = normalizeCeremonyTier(tier);
  if (ceremony === "GENERAL") return;
  await playSoundKey("CHARGE", tier, enabled);
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
  const ceremony = normalizeCeremonyTier(tier);
  if (ceremony === "GENERAL") return;
  const base = opts?.afterBoxTeaser ? REVEAL_SOUND_SYNC.afterBoxTeaserMs : 0;
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
};

async function playTierSoundWithRate(
  tier: PrizeTier,
  enabled: boolean,
  rate: number,
  opts?: { pan?: number; revealIndex?: number; totalReveals?: number; isFinaleDraw?: boolean },
) {
  if (!enabled) return;
  const ok = await ensureAudio();
  if (!ok) {
    await playHapticFallback(tier);
    return;
  }
  try {
    const key = soundKeyForTier(tier);
    const player = await loadSoundKey(key);
    if (!player) {
      await playHapticFallback(tier);
      return;
    }
    const pan =
      opts?.pan ??
      resolveRevealSoundPan(opts?.revealIndex ?? 0, opts?.totalReveals ?? 1, opts?.isFinaleDraw ?? false);
    const playbackRate = Math.min(1.24, Math.max(0.85, rate * resolveSoundPackPlaybackMultiplier()));
    const volumeScale =
      resolveRevealAudioMultiplier() *
      resolveAudioRouteMultiplier() *
      resolvePanVolumeScale(pan) *
      resolveActiveEmotionProfile().volumeScale;
    const targetVolume = 0.92 * volumeScale;
    if ("setPlaybackRate" in player && typeof player.setPlaybackRate === "function") {
      player.setPlaybackRate(playbackRate);
    } else if ("playbackRate" in player) {
      (player as AudioPlayer & { playbackRate?: number }).playbackRate = playbackRate;
    }
    if ("volume" in player) {
      (player as AudioPlayer & { volume?: number }).volume = targetVolume;
    }
    await player.seekTo(0);
    player.play();
    playerStartedAt.set(player, Date.now());
    activePlayers.add(player);
    trackEffectEvent("reveal_sound_play", { tier, key, playbackRate, pan });
  } catch {
    await playHapticFallback(tier);
  }
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
  } = opts;
  if (!soundEnabled) return;
  const layers = getRuntimeRevealSoundLayers();
  const remote = getRevealRemoteConfig();
  if (layers.ambient && !ambientLoopActive && (opts.totalReveals ?? 1) > 1) {
    void startAmbientLoop(true);
  }
  const indexPitchDelay = revealIndex * 40;
  if (layers.charge) {
    playChargeSoundSynced(tier, soundEnabled, chargeMs, { afterBoxTeaser });
  }
  const finaleSilence = isFinaleDraw ? remote.silenceBeforeFinaleMs : 0;
  const pacingScale = pacing === "fast" ? 0.9 : pacing === "finale" || pacing === "ceremony" ? 1.05 : 1;
  const playbackRate = acceleratePlaybackRate(accelerateTier, 1 + revealIndex * 0.04) * pacingScale;
  const revealLayerOk = isFinaleDraw ? layers.finale : layers.reveal;
  if (!revealLayerOk) return;
  void crossfadeSoundLayers(null, isFinaleDraw ? "finale" : "reveal", remote.audioFadeOutMs);
  const ceremony = normalizeCeremonyTier(tier);
  const chargeDelay =
    ceremony === "GENERAL" ? 0 : Math.min(chargeMs, pacing === "fast" ? 160 : chargeMs);
  let tierDelayBase =
    (afterBoxTeaser ? REVEAL_SOUND_SYNC.afterBoxTeaserMs : REVEAL_SOUND_SYNC.flashPeakMs) +
    chargeDelay +
    indexPitchDelay;
  if ((opts.totalReveals ?? 1) > 1) {
    tierDelayBase = Math.min(tierDelayBase, pacing === "fast" ? 80 : pacing === "normal" ? 140 : 220);
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
  }, tierDelayBase + finaleSilence);
  soundTimers.add(timer);
}

export async function startAmbientLoop(enabled: boolean) {
  if (!enabled || ambientLoopActive || !getRuntimeRevealSoundLayers().ambient) return;
  const ok = await ensureAudio();
  if (!ok) return;
  const player = await loadSoundKey("CHARGE");
  if (!player) return;
  try {
    if ("volume" in player) (player as AudioPlayer & { volume?: number }).volume = 0.08;
    if ("loop" in player) (player as AudioPlayer & { loop?: boolean }).loop = true;
    await player.seekTo(0);
    player.play();
    activePlayers.add(player);
    ambientLoopActive = true;
    trackEffectEvent("reveal_sound_ambient_start");
  } catch {
    /* ignore */
  }
}

export async function stopAmbientLoop() {
  ambientLoopActive = false;
  trackEffectEvent("reveal_sound_ambient_stop");
}

async function playAmbientBed(ms: number) {
  if (ms <= 0 || !getRuntimeRevealSoundLayers().ambient) return;
  const player = await loadSoundKey("CHARGE");
  if (!player) return;
  try {
    if ("volume" in player) (player as AudioPlayer & { volume?: number }).volume = 0.04;
    if ("loop" in player) (player as AudioPlayer & { loop?: boolean }).loop = true;
    await player.seekTo(0);
    player.play();
    activePlayers.add(player);
    setTimeout(() => {
      try {
        if ("loop" in player) (player as AudioPlayer & { loop?: boolean }).loop = false;
        player.pause?.();
      } catch {
        /* ignore */
      }
    }, ms);
  } catch {
    /* ignore */
  }
}

export async function playTierVoiceLine(tier: PrizeTier, themeId?: string) {
  const remote = getRevealRemoteConfig();
  const uris = remote.voiceLineUris;
  if (!uris) return;
  const key = themeId ? `${normalizeCeremonyTier(tier)}_${themeId}` : normalizeCeremonyTier(tier);
  const uri = uris[key] ?? uris[normalizeCeremonyTier(tier)];
  if (!uri) return;
  const ok = await ensureAudio();
  if (!ok) return;
  try {
    const audio = await loadAudioModule();
    if (!audio) return;
    const player = audio.createAudioPlayer({ uri });
    player.play();
    activePlayers.add(player);
    trackEffectEvent("reveal_voice_line_play", { tier, themeId });
  } catch {
    trackEffectEvent("reveal_voice_line_failed", { tier });
  }
}

export function cancelScheduledRevealSoundTimers() {
  soundTimers.forEach(clearTimeout);
  soundTimers.clear();
}

export function cancelScheduledRevealSounds(opts?: { fadeMs?: number }) {
  void stopAmbientLoop();
  const fadeMs = opts?.fadeMs ?? getRevealRemoteConfig().audioFadeOutMs;
  if (fadeMs > 0) {
    fadeOutActiveSounds(fadeMs).finally(() => {
      cancelScheduledRevealSoundTimers();
    });
    return;
  }
  cancelScheduledRevealSoundTimers();
}

/** Crossfade between sound layers during phase transitions. */
export async function crossfadeSoundLayers(
  _prev: SoundLayer | null,
  _next: SoundLayer | null,
  ms?: number,
): Promise<void> {
  const fadeMs = ms ?? getRevealRemoteConfig().audioFadeOutMs;
  if (fadeMs <= 0) return;
  await fadeOutActiveSounds(Math.round(fadeMs * 0.55));
  trackEffectEvent("reveal_sound_crossfade", { from: _prev ?? "none", to: _next ?? "none", fadeMs });
}

async function fadeOutActiveSounds(fadeMs: number): Promise<void> {
  const players = [...activePlayers];
  if (!players.length) return;
  const steps = 4;
  const stepMs = Math.max(20, Math.floor(fadeMs / steps));
  for (let i = steps; i >= 0; i -= 1) {
    const volume = i / steps;
    players.forEach((p) => {
      try {
        if ("volume" in p) (p as AudioPlayer & { volume?: number }).volume = volume;
      } catch {
        /* ignore */
      }
    });
    await new Promise((r) => setTimeout(r, stepMs));
  }
  players.forEach((p) => {
    try {
      if (!canStopRevealPlayer(p)) {
        const started = playerStartedAt.get(p) ?? Date.now();
        const wait = Math.max(0, MIN_TIER_SOUND_PLAY_MS - (Date.now() - started));
        setTimeout(() => {
          try {
            p.pause?.();
          } catch {
            /* ignore */
          }
        }, wait);
        return;
      }
      p.pause?.();
    } catch {
      /* ignore */
    }
  });
  activePlayers.clear();
}

export async function warmupTierSounds() {
  const ok = await ensureAudio();
  if (!ok) {
    trackEffectEvent("reveal_sound_warmup_skipped");
    return;
  }
  await Promise.all(
    (["GENERAL", "HIDDEN", "LEGENDARY", "CHARGE"] as SoundKey[]).map((key) =>
      loadSoundKey(key).catch(() => undefined),
    ),
  );
  trackEffectEvent("reveal_sound_warmup_ok");
}

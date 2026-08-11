import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "./revealStorageNamespace";

const KEY_ANIM = "reveal_animations_enabled_v1";
const KEY_TEXT_ONLY = "reveal_text_only_v1";
const KEY_SOUND = "reveal_sound_enabled_v1";

function sk(base: string): string {
  return revealStorageKey(base);
}

export async function getRevealAnimationsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(sk(KEY_ANIM));
  if (raw === null) return true;
  return raw === "1";
}

export async function setRevealAnimationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_ANIM), enabled ? "1" : "0");
}

export async function getRevealTextOnlyMode(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(sk(KEY_TEXT_ONLY));
  return raw === "1";
}

export async function setRevealTextOnlyMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_TEXT_ONLY), enabled ? "1" : "0");
}

export async function getRevealSoundEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(sk(KEY_SOUND));
  if (raw === null) return true;
  return raw === "1";
}

export async function setRevealSoundEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_SOUND), enabled ? "1" : "0");
}

let cachedRevealSoundEnabled = true;

export function getRuntimeRevealSoundEnabled(): boolean {
  return cachedRevealSoundEnabled;
}

export function setRuntimeRevealSoundEnabled(enabled: boolean): void {
  cachedRevealSoundEnabled = enabled;
}

void getRevealSoundEnabled().then(setRuntimeRevealSoundEnabled);

const KEY_REPLAY_PREF = "reveal_replay_preference_v1";
const KEY_REPLAY_MODE = "reveal_replay_mode_v1";
const KEY_TICKER = "reveal_feed_ticker_v1";
const KEY_IMMERSIVE = "reveal_immersive_replay_v1";

export type RevealReplayPreference = "all" | "finale" | "highlights";
export type RevealReplayMode = "once" | "loop";

export async function getRevealReplayPreference(): Promise<RevealReplayPreference> {
  const raw = await AsyncStorage.getItem(sk(KEY_REPLAY_PREF));
  if (raw === "finale" || raw === "highlights") return raw;
  return "all";
}

export async function setRevealReplayPreference(pref: RevealReplayPreference): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_REPLAY_PREF), pref);
}

export async function getRevealReplayMode(): Promise<RevealReplayMode> {
  const raw = await AsyncStorage.getItem(sk(KEY_REPLAY_MODE));
  return raw === "loop" ? "loop" : "once";
}

export async function setRevealReplayMode(mode: RevealReplayMode): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_REPLAY_MODE), mode);
}

export async function getRevealFeedTickerEnabled(): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(sk(KEY_TICKER));
  if (raw === null) return null;
  return raw === "1";
}

export async function setRevealFeedTickerEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_TICKER), enabled ? "1" : "0");
}

export async function getRevealImmersiveReplay(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(sk(KEY_IMMERSIVE));
  return raw === "1";
}

export async function setRevealImmersiveReplay(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_IMMERSIVE), enabled ? "1" : "0");
}

const KEY_SOUND_PACK = "reveal_sound_pack_v1";

export type RevealSoundPack = "classic" | "cute" | "neon" | "minimal";

export async function getRevealSoundPack(): Promise<RevealSoundPack> {
  const raw = await AsyncStorage.getItem(sk(KEY_SOUND_PACK));
  if (raw === "cute" || raw === "neon" || raw === "minimal") return raw;
  return "classic";
}

export async function setRevealSoundPack(pack: RevealSoundPack): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_SOUND_PACK), pack);
}

const KEY_RHYTHM = "reveal_rhythm_preset_v1";
const KEY_PARTICLES = "reveal_particles_enabled_v1";
const KEY_SHAKE = "reveal_shake_enabled_v1";
const KEY_FLASH = "reveal_flash_enabled_v1";
const KEY_HAPTIC = "reveal_haptic_enabled_v1";
const KEY_SOUND_AMBIENT = "reveal_sound_ambient_v1";
const KEY_SOUND_CHARGE = "reveal_sound_charge_v1";
const KEY_SOUND_REVEAL = "reveal_sound_reveal_v1";
const KEY_SOUND_FINALE = "reveal_sound_finale_v1";
const KEY_VOICE_LINE = "reveal_voice_line_v1";
const KEY_FEED_OPT_OUT = "reveal_feed_opt_out_v1";
const KEY_RECORDING_SAFE = "reveal_recording_safe_v1";
const KEY_EFFECT_PRESET = "reveal_effect_preset_v1";
const KEY_CEREMONY_TEMPLATE = "reveal_ceremony_template_v1";
const KEY_FOCUS_MODE = "reveal_focus_mode_v1";
const KEY_VOICE_LINE_ENABLED = "reveal_voice_line_enabled_v1";

export type RevealRhythmPreset = "immersive" | "standard" | "rapid";

export async function getRevealRhythmPreset(): Promise<RevealRhythmPreset> {
  const raw = await AsyncStorage.getItem(sk(KEY_RHYTHM));
  if (raw === "immersive" || raw === "rapid") return raw;
  return "standard";
}

export async function setRevealRhythmPreset(preset: RevealRhythmPreset): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_RHYTHM), preset);
}

export function rhythmPresetScale(preset: RevealRhythmPreset): number {
  if (preset === "immersive") return 1.18;
  if (preset === "rapid") return 0.82;
  return 1;
}

async function readBool(key: string, defaultValue: boolean): Promise<boolean> {
  const raw = await AsyncStorage.getItem(sk(key));
  if (raw === null) return defaultValue;
  return raw === "1";
}

async function writeBool(key: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(sk(key), enabled ? "1" : "0");
}

export async function getRevealParticlesEnabled(): Promise<boolean> {
  return readBool(KEY_PARTICLES, true);
}

export async function setRevealParticlesEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_PARTICLES, enabled);
}

export async function getRevealShakeEnabled(): Promise<boolean> {
  return readBool(KEY_SHAKE, true);
}

export async function setRevealShakeEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_SHAKE, enabled);
}

export async function getRevealFlashEnabled(): Promise<boolean> {
  return readBool(KEY_FLASH, true);
}

export async function setRevealFlashEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_FLASH, enabled);
}

export async function getRevealHapticEnabled(): Promise<boolean> {
  return readBool(KEY_HAPTIC, true);
}

export async function setRevealHapticEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_HAPTIC, enabled);
}

let cachedRhythm: RevealRhythmPreset = "standard";
export function getRuntimeRevealRhythmPreset(): RevealRhythmPreset {
  return cachedRhythm;
}
export function setRuntimeRevealRhythmPreset(preset: RevealRhythmPreset): void {
  cachedRhythm = preset;
}
void getRevealRhythmPreset().then(setRuntimeRevealRhythmPreset);

let cachedParticles = true;
let cachedShake = true;
let cachedFlash = true;
let cachedHaptic = true;

export function getRuntimeRevealParticlesEnabled(): boolean {
  return cachedParticles;
}
export function setRuntimeRevealParticlesEnabled(enabled: boolean): void {
  cachedParticles = enabled;
}
export function getRuntimeRevealShakeEnabled(): boolean {
  return cachedShake;
}
export function setRuntimeRevealShakeEnabled(enabled: boolean): void {
  cachedShake = enabled;
}
export function getRuntimeRevealFlashEnabled(): boolean {
  return cachedFlash;
}
export function setRuntimeRevealFlashEnabled(enabled: boolean): void {
  cachedFlash = enabled;
}
export function getRuntimeRevealHapticEnabled(): boolean {
  return cachedHaptic;
}
export function setRuntimeRevealHapticEnabled(enabled: boolean): void {
  cachedHaptic = enabled;
}

void getRevealParticlesEnabled().then(setRuntimeRevealParticlesEnabled);
void getRevealShakeEnabled().then(setRuntimeRevealShakeEnabled);
void getRevealFlashEnabled().then(setRuntimeRevealFlashEnabled);
void getRevealHapticEnabled().then(setRuntimeRevealHapticEnabled);

export type RevealEffectPresetId = "default" | "neon" | "warm";

export async function getRevealEffectPresetId(): Promise<RevealEffectPresetId> {
  const raw = await AsyncStorage.getItem(sk(KEY_EFFECT_PRESET));
  if (raw === "neon" || raw === "default" || raw === "warm") return raw;
  // Night Cabinet default: warm brass when unset
  return "warm";
}

export async function setRevealEffectPresetId(id: RevealEffectPresetId): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_EFFECT_PRESET), id);
  cachedEffectPresetId = id;
}

let cachedEffectPresetId: RevealEffectPresetId = "warm";
export function getRuntimeRevealEffectPresetId(): RevealEffectPresetId {
  return cachedEffectPresetId;
}
export function setRuntimeRevealEffectPresetId(id: RevealEffectPresetId): void {
  cachedEffectPresetId = id;
}
void getRevealEffectPresetId().then((id) => {
  cachedEffectPresetId = id;
});

export type RevealCeremonyTemplateId =
  | "efficiency"
  | "immersive"
  | "standard"
  | "eyeCare"
  | "collectMinimal";

export async function getRevealCeremonyTemplateId(): Promise<RevealCeremonyTemplateId> {
  const raw = await AsyncStorage.getItem(sk(KEY_CEREMONY_TEMPLATE));
  if (
    raw === "efficiency" ||
    raw === "immersive" ||
    raw === "eyeCare" ||
    raw === "collectMinimal" ||
    raw === "standard"
  ) {
    return raw;
  }
  return "standard";
}

export async function setRevealCeremonyTemplateId(id: RevealCeremonyTemplateId): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_CEREMONY_TEMPLATE), id);
  cachedCeremonyTemplateId = id;
}

let cachedCeremonyTemplateId: RevealCeremonyTemplateId = "standard";
export function getRuntimeRevealCeremonyTemplateId(): RevealCeremonyTemplateId {
  return cachedCeremonyTemplateId;
}
export function setRuntimeRevealCeremonyTemplateId(id: RevealCeremonyTemplateId): void {
  cachedCeremonyTemplateId = id;
}
void getRevealCeremonyTemplateId().then((id) => {
  cachedCeremonyTemplateId = id;
});

export async function getRevealFocusModeEnabled(): Promise<boolean> {
  return readBool(KEY_FOCUS_MODE, false);
}

export async function setRevealFocusModeEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_FOCUS_MODE, enabled);
  cachedFocusMode = enabled;
}

let cachedFocusMode = false;
export function getRuntimeRevealFocusModeEnabled(): boolean {
  return cachedFocusMode;
}
void getRevealFocusModeEnabled().then((v) => {
  cachedFocusMode = v;
});

export async function getRevealVoiceLineEnabled(): Promise<boolean> {
  return readBool(KEY_VOICE_LINE_ENABLED, false);
}

export async function setRevealVoiceLineEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_VOICE_LINE_ENABLED, enabled);
}

export async function getRevealFeedOptOut(): Promise<boolean> {
  return readBool(KEY_FEED_OPT_OUT, false);
}

export async function setRevealFeedOptOut(optOut: boolean): Promise<void> {
  await writeBool(KEY_FEED_OPT_OUT, optOut);
}

export async function getRevealRecordingSafeMode(): Promise<boolean> {
  return readBool(KEY_RECORDING_SAFE, false);
}

export async function setRevealRecordingSafeMode(enabled: boolean): Promise<void> {
  await writeBool(KEY_RECORDING_SAFE, enabled);
}

async function readSoundLayer(key: string): Promise<boolean> {
  return readBool(key, true);
}

export async function getRevealSoundLayerEnabled(
  layer: "ambient" | "charge" | "reveal" | "finale",
): Promise<boolean> {
  const map = {
    ambient: KEY_SOUND_AMBIENT,
    charge: KEY_SOUND_CHARGE,
    reveal: KEY_SOUND_REVEAL,
    finale: KEY_SOUND_FINALE,
  } as const;
  return readSoundLayer(map[layer]);
}

export async function setRevealSoundLayerEnabled(
  layer: "ambient" | "charge" | "reveal" | "finale",
  enabled: boolean,
): Promise<void> {
  const map = {
    ambient: KEY_SOUND_AMBIENT,
    charge: KEY_SOUND_CHARGE,
    reveal: KEY_SOUND_REVEAL,
    finale: KEY_SOUND_FINALE,
  } as const;
  await writeBool(map[layer], enabled);
}

let cachedSoundLayers = { ambient: true, charge: true, reveal: true, finale: true };
export function getRuntimeRevealSoundLayers() {
  return cachedSoundLayers;
}
export function setRuntimeRevealSoundLayer(
  layer: keyof typeof cachedSoundLayers,
  enabled: boolean,
) {
  cachedSoundLayers = { ...cachedSoundLayers, [layer]: enabled };
}
const KEY_LARGE_TOUCH = "reveal_large_touch_v1";
const KEY_A11Y_VOICE_RATE = "reveal_a11y_voice_rate_v1";
const KEY_PLAYER_FIT = "reveal_player_fit_v1";

export type RevealA11yVoiceRate = "slow" | "normal" | "fast";
export type RevealPlayerFit = "fitScreen" | "original";

export async function getRevealLargeTouchTargets(): Promise<boolean> {
  return readBool(KEY_LARGE_TOUCH, false);
}

export async function setRevealLargeTouchTargets(enabled: boolean): Promise<void> {
  await writeBool(KEY_LARGE_TOUCH, enabled);
}

export async function getRevealA11yVoiceRate(): Promise<RevealA11yVoiceRate> {
  const raw = await AsyncStorage.getItem(sk(KEY_A11Y_VOICE_RATE));
  if (raw === "slow" || raw === "fast") return raw;
  return "normal";
}

export async function setRevealA11yVoiceRate(rate: RevealA11yVoiceRate): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_A11Y_VOICE_RATE), rate);
}

export function revealA11yVoiceDelayMs(rate: RevealA11yVoiceRate): number {
  if (rate === "slow") return 220;
  if (rate === "fast") return 60;
  return 120;
}

let cachedPlayerFit: RevealPlayerFit = "fitScreen";

export function getRuntimeRevealPlayerFit(): RevealPlayerFit {
  return cachedPlayerFit;
}

export async function getRevealPlayerFit(): Promise<RevealPlayerFit> {
  const raw = await AsyncStorage.getItem(sk(KEY_PLAYER_FIT));
  return raw === "original" ? "original" : "fitScreen";
}

export async function setRevealPlayerFit(fit: RevealPlayerFit): Promise<void> {
  await AsyncStorage.setItem(sk(KEY_PLAYER_FIT), fit);
  cachedPlayerFit = fit;
}

void getRevealPlayerFit().then((fit) => {
  cachedPlayerFit = fit;
});

const KEY_DANMAKU = "reveal_danmaku_v1";
const KEY_A11Y_GESTURES = "reveal_a11y_gestures_v1";

let cachedDanmaku = false;
let cachedA11yGestures = false;

export async function getRevealDanmakuEnabled(): Promise<boolean> {
  return readBool(KEY_DANMAKU, false);
}

export async function setRevealDanmakuEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_DANMAKU, enabled);
  cachedDanmaku = enabled;
}

export function getRuntimeRevealDanmakuEnabled(): boolean {
  return cachedDanmaku;
}

export async function getRevealA11yGesturesEnabled(): Promise<boolean> {
  return readBool(KEY_A11Y_GESTURES, false);
}

export async function setRevealA11yGesturesEnabled(enabled: boolean): Promise<void> {
  await writeBool(KEY_A11Y_GESTURES, enabled);
  cachedA11yGestures = enabled;
}

export function getRuntimeRevealA11yGesturesEnabled(): boolean {
  return cachedA11yGestures;
}

void getRevealDanmakuEnabled().then((v) => {
  cachedDanmaku = v;
});
void getRevealA11yGesturesEnabled().then((v) => {
  cachedA11yGestures = v;
});

void Promise.all([
  getRevealSoundLayerEnabled("ambient"),
  getRevealSoundLayerEnabled("charge"),
  getRevealSoundLayerEnabled("reveal"),
  getRevealSoundLayerEnabled("finale"),
]).then(([ambient, charge, reveal, finale]) => {
  cachedSoundLayers = { ambient, charge, reveal, finale };
});

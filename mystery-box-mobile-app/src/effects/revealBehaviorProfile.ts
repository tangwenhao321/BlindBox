import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "reveal_behavior_profile_v1";

export type RevealBehaviorCounters = {
  skipOne: number;
  skipRemaining: number;
  accelerateTier1: number;
  accelerateTier2: number;
  pause: number;
  complete: number;
  play: number;
};

export type RevealBehaviorProfile = RevealBehaviorCounters & {
  updatedAt: number;
};

const EMPTY: RevealBehaviorProfile = {
  skipOne: 0,
  skipRemaining: 0,
  accelerateTier1: 0,
  accelerateTier2: 0,
  pause: 0,
  complete: 0,
  play: 0,
  updatedAt: 0,
};

let cached: RevealBehaviorProfile | null = null;
let loadPromise: Promise<RevealBehaviorProfile> | null = null;

export async function loadRevealBehaviorProfile(): Promise<RevealBehaviorProfile> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        cached = { ...EMPTY };
        return cached;
      }
      const parsed = JSON.parse(raw) as Partial<RevealBehaviorProfile>;
      cached = { ...EMPTY, ...parsed, updatedAt: parsed.updatedAt ?? 0 };
      return cached;
    } catch {
      cached = { ...EMPTY };
      return cached;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

async function persist(profile: RevealBehaviorProfile): Promise<void> {
  cached = profile;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export type RevealBehaviorEvent =
  | "skip_one"
  | "skip_remaining"
  | "accelerate_tier1"
  | "accelerate_tier2"
  | "pause"
  | "complete"
  | "play";

export async function recordRevealBehavior(event: RevealBehaviorEvent): Promise<void> {
  const profile = await loadRevealBehaviorProfile();
  const next = { ...profile, updatedAt: Date.now() };
  switch (event) {
    case "skip_one":
      next.skipOne += 1;
      break;
    case "skip_remaining":
      next.skipRemaining += 1;
      break;
    case "accelerate_tier1":
      next.accelerateTier1 += 1;
      break;
    case "accelerate_tier2":
      next.accelerateTier2 += 1;
      break;
    case "pause":
      next.pause += 1;
      break;
    case "complete":
      next.complete += 1;
      break;
    case "play":
      next.play += 1;
      break;
    default:
      break;
  }
  await persist(next);
}

export function mapEffectEventToBehavior(event: string): RevealBehaviorEvent | null {
  if (event === "reveal_skip_one") return "skip_one";
  if (event === "reveal_skip_remaining") return "skip_remaining";
  if (event === "reveal_accelerate_tier1") return "accelerate_tier1";
  if (event === "reveal_accelerate_tier2") return "accelerate_tier2";
  if (event === "reveal_pause") return "pause";
  if (event === "reveal_sequence_complete") return "complete";
  if (event === "reveal_play") return "play";
  return null;
}

/** Frequent skip/accelerate → compress 0.85–0.92; patient viewers → slight slow 1.02–1.05. User rhythm preset wins elsewhere. */
export function resolveBehaviorRhythmScale(profile?: RevealBehaviorProfile | null): number {
  const p = profile ?? cached ?? EMPTY;
  const sessions = Math.max(1, p.play);
  const skipRate = (p.skipOne + p.skipRemaining * 2) / sessions;
  const accelRate = (p.accelerateTier1 + p.accelerateTier2 * 1.5) / sessions;
  const completeRate = p.complete / sessions;

  if (skipRate >= 0.45 || accelRate >= 0.35) {
    return Math.max(0.85, 0.92 - Math.min(0.07, skipRate * 0.08));
  }
  if (completeRate >= 0.55 && skipRate < 0.12) {
    return Math.min(1.05, 1.02 + completeRate * 0.03);
  }
  return 1;
}

export async function clearRevealBehaviorProfile(): Promise<void> {
  cached = { ...EMPTY };
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function resetRevealBehaviorProfileForTests(): void {
  cached = { ...EMPTY };
  loadPromise = null;
}

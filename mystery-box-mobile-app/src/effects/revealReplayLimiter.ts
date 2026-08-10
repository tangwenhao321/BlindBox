import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRevealRemoteConfig } from "./revealRemote";
import { isRevealMinorModeActive, resolveMinorModeReplayDailyCap } from "./revealMinorMode";

const KEY = "reveal_replay_limit_v1";

type ReplayLimitState = {
  dayKey: string;
  count: number;
};

function dayKeyNow() {
  return new Date().toISOString().slice(0, 10);
}

async function loadState(): Promise<ReplayLimitState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { dayKey: dayKeyNow(), count: 0 };
    const parsed = JSON.parse(raw) as ReplayLimitState;
    if (parsed.dayKey !== dayKeyNow()) return { dayKey: dayKeyNow(), count: 0 };
    return parsed;
  } catch {
    return { dayKey: dayKeyNow(), count: 0 };
  }
}

async function saveState(state: ReplayLimitState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function recordManualReplay(): Promise<{ allowed: boolean; degraded: boolean; count: number }> {
  const remote = getRevealRemoteConfig();
  const state = await loadState();
  const next = { dayKey: state.dayKey, count: state.count + 1 };
  await saveState(next);
  const cap = isRevealMinorModeActive() ? resolveMinorModeReplayDailyCap() : (remote.replayDailyCap ?? 20);
  const degradeAfter = remote.replayDegradeAfter ?? 12;
  return {
    allowed: next.count <= cap,
    degraded: next.count >= degradeAfter,
    count: next.count,
  };
}

export async function clearReplayLimitForTests() {
  await AsyncStorage.removeItem(KEY);
}

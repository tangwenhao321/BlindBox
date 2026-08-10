import { API_BASE_URL } from "../api";
import { api } from "../api";

export type RoomState = "idle" | "joining" | "synced" | "polling";

export type RoomProgress = {
  revealIndex: number;
  total: number;
  phase: string;
  ts?: number;
};

export type RoomReaction = {
  memberId: string;
  emoji: string;
  ts: number;
};

export type RoomRole = "host" | "spectator" | null;

type RoomListener = (state: RoomState) => void;
type ProgressListener = (progress: RoomProgress | null) => void;
type ReactionListener = (reactions: RoomReaction[]) => void;

let roomState: RoomState = "idle";
let roomId: string | null = null;
let roomRole: RoomRole = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let ws: WebSocket | null = null;
let lastProgress: RoomProgress | null = null;
let recentReactions: RoomReaction[] = [];
const listeners = new Set<RoomListener>();
const progressListeners = new Set<ProgressListener>();
const reactionListeners = new Set<ReactionListener>();

const POLL_MS = 4000;
const REACTION_COMPENSATION_MS = 10_000;

let reactionCompensationTimer: ReturnType<typeof setInterval> | null = null;

function wsBaseUrl(): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  if (base.startsWith("https://")) return base.replace(/^https:/, "wss:");
  if (base.startsWith("http://")) return base.replace(/^http:/, "ws:");
  return `ws://${base}`;
}

function notify(): void {
  listeners.forEach((fn) => fn(roomState));
}

function notifyProgress(): void {
  progressListeners.forEach((fn) => fn(lastProgress));
}

function notifyReactions(): void {
  reactionListeners.forEach((fn) => fn(recentReactions));
}

function stopReactionCompensationPoll(): void {
  if (reactionCompensationTimer) {
    clearInterval(reactionCompensationTimer);
    reactionCompensationTimer = null;
  }
}

function startReactionCompensationPoll(activeRoomId: string): void {
  stopReactionCompensationPoll();
  void pollRoomReactions(activeRoomId);
  reactionCompensationTimer = setInterval(() => {
    void pollRoomReactions(activeRoomId);
  }, REACTION_COMPENSATION_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function closeWs(): void {
  stopReactionCompensationPoll();
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
}

async function pollRoomState(activeRoomId: string): Promise<void> {
  try {
    const response = await api.get<{
      result?: { revealIndex?: number; total?: number; phase?: string; ts?: number };
      revealIndex?: number;
      total?: number;
      phase?: string;
      ts?: number;
    }>(`/front/reveal/room/${encodeURIComponent(activeRoomId)}/state`);
    const data = response.data.result ?? response.data;
    if (!data) return;
    lastProgress = {
      revealIndex: data.revealIndex ?? 0,
      total: data.total ?? lastProgress?.total ?? 0,
      phase: data.phase ?? "idle",
      ts: data.ts,
    };
    notifyProgress();
  } catch {
    /* polling fallback is best-effort */
  }
}

async function pollRoomReactions(activeRoomId: string): Promise<void> {
  try {
    const response = await api.get<
      | { result?: RoomReaction[] }
      | RoomReaction[]
    >(`/front/reveal/room/${encodeURIComponent(activeRoomId)}/reactions`);
    const rows = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data.result)
        ? response.data.result
        : [];
    if (!rows.length) return;
    recentReactions = rows.slice(0, 20);
    notifyReactions();
  } catch {
    /* optional */
  }
}

function startPollingFallback(activeRoomId: string): void {
  stopReactionCompensationPoll();
  stopPolling();
  roomState = "polling";
  notify();
  void pollRoomState(activeRoomId);
  void pollRoomReactions(activeRoomId);
  pollTimer = setInterval(() => {
    void pollRoomState(activeRoomId);
    void pollRoomReactions(activeRoomId);
  }, POLL_MS);
}

function handleWsMessage(raw: string): void {
  try {
    const payload = JSON.parse(raw) as {
      type?: string;
      revealIndex?: number;
      phase?: string;
      ts?: number;
      total?: number;
      memberId?: string;
      emoji?: string;
    };
    if (payload.type === "progress" || payload.type === "join") {
      lastProgress = {
        revealIndex: payload.revealIndex ?? lastProgress?.revealIndex ?? 0,
        total: payload.total ?? lastProgress?.total ?? 0,
        phase: payload.phase ?? "playing",
        ts: payload.ts ?? Date.now(),
      };
      notifyProgress();
    }
    if (payload.type === "reaction" && payload.emoji && payload.memberId) {
      recentReactions = [
        {
          memberId: payload.memberId,
          emoji: payload.emoji,
          ts: payload.ts ?? Date.now(),
        },
        ...recentReactions,
      ].slice(0, 20);
      notifyReactions();
    }
  } catch {
    /* ignore malformed frames */
  }
}

function sendWs(payload: Record<string, unknown>): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

export function getRevealSocialRoomId(): string | null {
  return roomId;
}

export function getRevealSocialRoomState(): RoomState {
  return roomState;
}

export function getRevealRoomProgress(): RoomProgress | null {
  return lastProgress;
}

export function subscribeRevealSocialRoom(listener: RoomListener): () => void {
  listeners.add(listener);
  listener(roomState);
  return () => listeners.delete(listener);
}

export function subscribeRevealRoomProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  listener(lastProgress);
  return () => progressListeners.delete(listener);
}

export function subscribeRevealRoomReactions(listener: ReactionListener): () => void {
  reactionListeners.add(listener);
  listener(recentReactions);
  return () => reactionListeners.delete(listener);
}

export function getRevealRoomRole(): RoomRole {
  return roomRole;
}

export async function connectRevealRoom(
  orderId: string,
  token?: string | null,
  role: RoomRole = "host",
): Promise<boolean> {
  roomId = orderId;
  roomRole = role;
  roomState = "joining";
  notify();
  closeWs();
  stopPolling();

  if (typeof WebSocket === "undefined") {
    startPollingFallback(orderId);
    return false;
  }

  try {
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    const url = `${wsBaseUrl()}/ws/reveal-room/${encodeURIComponent(orderId)}${query}`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      roomState = "synced";
      notify();
      sendWs({ type: "join" });
      if (roomId) {
        startReactionCompensationPoll(roomId);
      }
    };
    ws.onmessage = (event) => handleWsMessage(String(event.data));
    ws.onerror = () => {
      closeWs();
      startPollingFallback(orderId);
    };
    ws.onclose = () => {
      if (roomId === orderId && roomState === "synced") {
        startPollingFallback(orderId);
      }
    };
    return true;
  } catch {
    startPollingFallback(orderId);
    return false;
  }
}

export async function joinRevealSpectatorRoom(orderId: string, token?: string | null): Promise<boolean> {
  return connectRevealRoom(orderId, token, "spectator");
}

export function publishRevealRoomProgress(progress: RoomProgress): void {
  if (roomRole === "spectator") return;
  lastProgress = { ...progress, ts: Date.now() };
  notifyProgress();
  sendWs({
    type: "progress",
    revealIndex: progress.revealIndex,
    total: progress.total,
    phase: progress.phase,
    ts: lastProgress.ts,
  });
}

export function publishRevealRoomReaction(emoji: string): void {
  if (roomRole !== "host" || !emoji) return;
  recentReactions = [
    {
      memberId: "host",
      emoji,
      ts: Date.now(),
    },
    ...recentReactions,
  ].slice(0, 20);
  notifyReactions();
  sendWs({ type: "reaction", emoji });
}

export function leaveRevealSpectatorRoom(): void {
  if (roomId) {
    sendWs({ type: "leave" });
  }
  stopReactionCompensationPoll();
  stopPolling();
  closeWs();
  roomState = "idle";
  roomId = null;
  roomRole = null;
  lastProgress = null;
  recentReactions = [];
  notify();
  notifyProgress();
  notifyReactions();
}

export function leaveRevealHostRoom(finalProgress?: Partial<RoomProgress> | null): void {
  if (roomRole === "host" && roomId) {
    const base = lastProgress ?? { revealIndex: 0, total: 0, phase: "idle" };
    publishRevealRoomProgress({
      revealIndex: finalProgress?.revealIndex ?? base.revealIndex,
      total: finalProgress?.total ?? base.total,
      phase: finalProgress?.phase ?? "idle",
    });
  }
  leaveRevealSpectatorRoom();
}

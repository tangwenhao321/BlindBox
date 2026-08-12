import { useEffect, useRef } from "react";
import { API_BASE_URL, buildAuthHeaders } from "../api";
import { clientPlatformHeaders } from "../utils/clientAttestation";

type SseOptions<T> = {
  path: string;
  token?: string;
  enabled: boolean;
  eventName: string;
  pollMs: number;
  pollFetch: () => Promise<T>;
  onData: (data: T) => void;
  /** Called once when SSE gives up and polling fallback is active. */
  onPollDegraded?: () => void;
};

const MAX_SSE_RETRIES = 8;

/** SSE with polling fallback; auto-reconnects SSE with backoff when stream drops. */
export function useSsePoll<T>(options: SseOptions<T>) {
  const { path, token, enabled, eventName, pollMs, pollFetch, onData, onPollDegraded } = options;
  const onPollDegradedRef = useRef(onPollDegraded);
  onPollDegradedRef.current = onPollDegraded;
  const onDataRef = useRef(onData);
  const pollFetchRef = useRef(pollFetch);
  onDataRef.current = onData;
  pollFetchRef.current = pollFetch;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let abort: AbortController | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let sseAttempts = 0;
    let pollingActive = false;
    let pollDegradedNotified = false;
    let pollFailStreak = 0;

    const startPoll = () => {
      if (pollingActive) return;
      pollingActive = true;
      if (!pollDegradedNotified) {
        pollDegradedNotified = true;
        onPollDegradedRef.current?.();
      }
      const tick = () => {
        pollFetchRef
          .current()
          .then((data) => {
            pollFailStreak = 0;
            if (!cancelled) onDataRef.current(data);
          })
          .catch(() => {
            pollFailStreak += 1;
            if (pollFailStreak >= 3 && !pollDegradedNotified) {
              pollDegradedNotified = true;
              onPollDegradedRef.current?.();
            }
          });
      };
      void tick();
      pollTimer = setInterval(tick, pollMs);
    };

    const stopPoll = () => {
      pollingActive = false;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };

    const scheduleSseRetry = () => {
      if (cancelled || sseAttempts >= MAX_SSE_RETRIES) {
        startPoll();
        return;
      }
      sseAttempts += 1;
      const delay = Math.min(30_000, 1000 * 2 ** (sseAttempts - 1));
      retryTimer = setTimeout(() => {
        if (!cancelled) void trySse();
      }, delay);
    };

    const trySse = async () => {
      if (typeof fetch !== "function") {
        startPoll();
        return;
      }
      abort?.abort();
      abort = new AbortController();
      try {
        const headers: Record<string, string> = {
          Accept: "text/event-stream",
          ...clientPlatformHeaders(),
        };
        if (token) Object.assign(headers, buildAuthHeaders(token) as Record<string, string>);
        const res = await fetch(`${API_BASE_URL}${path}`, { headers, signal: abort.signal });
        if (!res.ok || !res.body || typeof res.body.getReader !== "function") {
          scheduleSseRetry();
          return;
        }
        stopPoll();
        sseAttempts = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const block of parts) {
            if (!block.includes(`event:${eventName}`) && !block.includes(`event: ${eventName}`)) continue;
            const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const json = dataLine.replace(/^data:\s?/, "");
            try {
              onDataRef.current(JSON.parse(json) as T);
            } catch {
              // ignore malformed chunk
            }
          }
        }
        if (!cancelled) scheduleSseRetry();
      } catch {
        if (!cancelled) scheduleSseRetry();
      }
    };

    void trySse();
    return () => {
      cancelled = true;
      abort?.abort();
      if (retryTimer) clearTimeout(retryTimer);
      stopPoll();
    };
  }, [path, token, enabled, eventName, pollMs]);
}

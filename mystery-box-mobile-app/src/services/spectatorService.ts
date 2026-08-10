import { ApiClientError, api } from "../api";

export type SpectatorSnapshot = Record<string, unknown>;

export type SpectatorRevealFetchResult =
  | {
      status: "ok";
      orderId?: string;
      phase?: string;
      snapshot: SpectatorSnapshot;
    }
  | { status: "expired" }
  | { status: "error" };

function isSpectatorExpiredError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return (
    /REVEAL_SPECTATOR_EXPIRED|观战链接已失效|观战链接已过期/i.test(error.message) ||
    /expired/i.test(error.message)
  );
}

export async function createSpectatorToken(
  authToken: string,
  payload: { orderId?: string; boxId?: string; phase?: string; snapshot?: SpectatorSnapshot },
): Promise<string | null> {
  try {
    const response = await api.post<{ result: { token: string } }>(
      "/front/reveal/spectator-token",
      payload,
      { headers: { Authorization: authToken } },
    );
    return response.data.result?.token ?? null;
  } catch {
    return null;
  }
}

export async function updateSpectatorToken(
  authToken: string,
  token: string,
  payload: { phase?: string; snapshot?: SpectatorSnapshot },
): Promise<boolean> {
  try {
    await api.patch(`/front/reveal/spectator/${encodeURIComponent(token)}`, payload, {
      headers: { Authorization: authToken },
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchActiveSpectatorToken(authToken: string, orderId: string): Promise<string | null> {
  try {
    const response = await api.get<{ result: { token: string } }>(
      `/front/reveal/spectator-token/active/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: authToken } },
    );
    return response.data.result?.token ?? null;
  } catch {
    return null;
  }
}

export async function fetchSpectatorReveal(token: string): Promise<SpectatorRevealFetchResult> {
  try {
    const response = await api.get<{
      result: SpectatorSnapshot & { phase?: string; orderId?: string; snapshot?: SpectatorSnapshot };
    }>(`/front/reveal/spectator/${encodeURIComponent(token)}`);
    const row = response.data.result;
    if (!row) return { status: "error" };
    const snapshot = (row.snapshot as SpectatorSnapshot | undefined) ?? row;
    return {
      status: "ok",
      orderId: typeof row.orderId === "string" ? row.orderId : undefined,
      phase: typeof row.phase === "string" ? row.phase : undefined,
      snapshot: snapshot as SpectatorSnapshot,
    };
  } catch (error) {
    if (isSpectatorExpiredError(error)) return { status: "expired" };
    return { status: "error" };
  }
}

export async function resolveSpectatorShareToken(
  authToken: string,
  orderId: string,
  existingToken: string | null | undefined,
  payload: { boxId?: string; phase?: string; snapshot?: SpectatorSnapshot },
): Promise<string | null> {
  let token = existingToken ?? (await fetchActiveSpectatorToken(authToken, orderId));
  if (token) {
    await updateSpectatorToken(authToken, token, {
      phase: payload.phase,
      snapshot: payload.snapshot,
    });
    return token;
  }
  return createSpectatorToken(authToken, {
    orderId,
    boxId: payload.boxId,
    phase: payload.phase,
    snapshot: payload.snapshot,
  });
}
